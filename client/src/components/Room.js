import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";

function Room(props) {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const peerConnection = useRef();
  const socketRef = useRef();
  const localStream = useRef();
  const remoteStream = useRef();
  const room = useRef();
  const iceServersTwilio = useRef();
  const [localVideoSize, setLocalVideoSize] = useState(false);
  const [disabled, setDisabled] = useState(true);

  /* DATACHANNEL */
  const sendChannel = useRef();
  const [allMessages, setAllMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  /* SCREENSHARE */
  const senders = useRef([]);

  useEffect(() => {
    /* Handling Browser compatibility, Local device access & add Stream  */
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    const video = {
      width: { exact: 1280 },
      height: { exact: 720 },
    };

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: video })
      .then((stream) => {
        localVideo.current.srcObject = stream;
        localVideo.current.volume = 0;
        localStream.current = stream;

        /* Connecting SOCKETIO client<->server */
        socketRef.current = io("http://localhost:8081");

        /* CREATE OR JOIN room */
        room.current = props.match.params.roomId;
        if (room.current) {
          socketRef.current.emit("createOrJoinRoom", room.current);
          socketRef.current.on("userJoinedRoom", (joinerId) => {
            console.log(`>>> User-${joinerId} just joined the chat`);
            handleCall(joinerId);
            remoteStream.current = joinerId;
            setLocalVideoSize(true);
            setDisabled(false);
          });
          socketRef.current.on("fullRoomMessage", (message) => {
            console.log(`>>> We are sorry, the room is Full`);
          });
        } else {
          console.log(`>>> Some ERROR occured while generating room ID!!`);
        }

        /* TWILIO ICESERVERS TOKEN */
        socketRef.current.on("token", (token) => {
          iceServersTwilio.current = token.iceServers;
        });
        socketRef.current.emit("token");

        /* OFFER, ANSWER & ICECANDIDATE LISTNERS */
        socketRef.current.on("offer", handleRecieveCall);
        socketRef.current.on("answer", handleAnswer);
        socketRef.current.on("iceCandidate", handleNewICECandidateData);

        socketRef.current.on("hangUpRemote", handleRemoteHangUp);
      });
  }, []);

  /* HANDLING CALL */
  const handleCall = (joinerId) => {
    peerRef.current = handleCreatePeerConnection(joinerId);

    /* CREATE DATACHANNEL */
    sendChannel.current = peerRef.current.createDataChannel("sendChannel");
    sendChannel.current.onmessage = handleRecieveMessage;

    localStream.current
      .getTracks()
      .forEach((track) =>
        senders.current.push(
          peerRef.current.addTrack(track, localStream.current)
        )
      );
  };

  /* HANDLING RECIEVEMESSAGES */
  const handleRecieveMessage = (ev) => {
    setAllMessages((messages) => [
      ...messages,
      {
        id: uuidv4(),
        sender: "remote",
        value: ev.data,
        date: moment().format("ddd, h:mm A"),
      },
    ]);
  };

  /* HANDLING PEERCONNECTION */
  const handleCreatePeerConnection = (joinerId) => {
    const iceConfiguration = {
      iceServers: iceServersTwilio.current,
    };

    peerConnection.current = new RTCPeerConnection(iceConfiguration);
    peerConnection.current.onicecandidate = handleOnIceCandidate;
    peerConnection.current.ontrack = handleOnTrack;
    peerConnection.current.onnegotiationneeded = () =>
      handleOnNegotiationNeeded(joinerId);

    return peerConnection.current;
  };

  /* HANDLING ONNEGOCIATIONNEEDED & EMMIT OFFER */
  const handleOnNegotiationNeeded = (joinerId) => {
    peerRef.current.createOffer().then((offer) => {
      return peerRef.current
        .setLocalDescription(offer)
        .then(() => {
          const payload = {
            target: joinerId,
            caller: socketRef.current.id,
            sdp: peerRef.current.localDescription,
          };
          socketRef.current.emit("offer", payload);
        })
        .catch((e) => console.log(e));
    });
  };

  /* HANDLING RECIEVECALL & EMMIT ANSWER */
  const handleRecieveCall = (incomingCall) => {
    peerRef.current = handleCreatePeerConnection();

    /* CREATE DATACHANNEL */
    peerRef.current.ondatachannel = (ev) => {
      sendChannel.current = ev.channel;
      sendChannel.current.onmessage = handleRecieveMessage;
    };

    const desc = new RTCSessionDescription(incomingCall.sdp);
    peerRef.current
      .setRemoteDescription(desc)
      .then(() => {
        localStream.current
          .getTracks()
          .forEach((track) =>
            senders.current.push(
              peerRef.current.addTrack(track, localStream.current)
            )
          );
      })
      .then(() => {
        return peerRef.current.createAnswer();
      })
      .then((answer) => {
        return peerRef.current.setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: incomingCall.caller,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription,
        };
        socketRef.current.emit("answer", payload);
        setLocalVideoSize(true);
        setDisabled(false);
      });
  };

  /* HANDLING ANSWER */
  const handleAnswer = (data) => {
    const desc = new RTCSessionDescription(data.sdp);
    peerRef.current.setRemoteDescription(desc).catch((e) => console.log(e));
  };

  /* HANDLING ONICECANDIDATE & EMMIT ICECANDIDATE */
  const handleOnIceCandidate = (e) => {
    if (e.candidate) {
      const payload = {
        target: remoteStream.current,
        candidate: e.candidate,
      };
      socketRef.current.emit("iceCandidate", payload);
    }
  };

  /* HANDLING NEWICECANDIDATE */
  const handleNewICECandidateData = (incomingObj) => {
    const candidate = new RTCIceCandidate(incomingObj);
    peerRef.current
      .addIceCandidate(candidate.toJSON())
      .catch((e) => console.log(e));
  };

  /* HANDLING ONTRACK - ADDING REMOTESTRAM TO REMOTEVIDEO */
  const handleOnTrack = (e) => {
    remoteVideo.current.srcObject = e.streams[0];
  };

  /* HANDLING HANGINGUP */
  const handleHangUp = () => {
    stop();
    socketRef.current.emit("hangingUp", room.current);
    setLocalVideoSize(false);
    setDisabled(true);
  };

  const handleRemoteHangUp = () => {
    stop();
    localVideo.current = null;
    setLocalVideoSize(false);
    setDisabled(true);
  };

  const stop = () => {
    sendChannel.current && sendChannel.current.close();
    peerConnection.current.close();
    peerConnection.current = null;
  };

  /* INPUT MESSAGE */
  const handleChange = (ev) => {
    setInputValue(ev.target.value);
  };

  const handleSendMessage = (ev) => {
    ev.preventDefault();
    sendChannel.current.send(inputValue);
    setAllMessages((messages) => [
      ...messages,
      {
        id: uuidv4(),
        sender: "local",
        value: inputValue,
        date: moment().format("ddd, h:mm A"),
      },
    ]);
    console.log(allMessages);
    setInputValue("");
  };

  /* HANDLING SCREENSHARING */
  const handleScreenShare = () => {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
      const screenTrack = stream.getTracks()[0];
      senders.current
        .find((sender) => sender.track.kind === "video")
        .replaceTrack(screenTrack);

      screenTrack.onended = () => {
        senders.current
          .find((sender) => sender.track.kind === "video")
          .replaceTrack(localStream.current.getTracks()[1]);
      };
    });
  };

  return (
    <div className="section">
      <div className="container">
        <div className="streaming-container">
          <h1 className="title">
            <span className="header-1">Major Project - Demo</span>
          </h1>
          <video
            className={localVideoSize ? "local" : "remote"}
            ref={localVideo}
            autoPlay
          ></video>
          <video
            className={localVideoSize ? "remote" : "hidden"}
            ref={remoteVideo}
            autoPlay
          ></video>
          <div className="buttons-container">
            <button
              className="button screenshare"
              onClick={handleScreenShare}
              disabled={disabled}
            >
              Share screen
            </button>
            <button
              className="button hangup"
              onClick={handleHangUp}
              disabled={disabled}
            >
              End call
            </button>
          </div>
        </div>
        <div className="chat-container">
          <div className="title">
            <span>Chat</span>
          </div>
          <div className="all-messages">
            {allMessages.map((message) => (
              <div className="single-message" key={message.id}>
                <span
                  className={
                    message.sender === "local"
                      ? "sender-local"
                      : "sender-remote"
                  }
                >
                  {message.sender === "local"
                    ? "Your Message"
                    : "Remote Message"}
                </span>
                <span className="date">{message.date}</span>
                <p className="message-data">{message.value}</p>
              </div>
            ))}
          </div>
          <div className="input">
            <input
              type="text"
              value={inputValue}
              onChange={handleChange}
              disabled={disabled}
            />
            <button
              className="button send-message"
              onClick={handleSendMessage}
              disabled={disabled}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room;
