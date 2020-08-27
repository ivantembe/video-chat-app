import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

function Room(props) {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const peerConnection = useRef();
  const socketRef = useRef();
  const localStream = useRef();
  const remoteStream = useRef();

  /* DATACHANNEL */
  const sendChannel = useRef();
  const [allMessages, setAllMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  /* SCREENSHARE */
  const senders = useRef([]);

  const iceServersTwilio = useRef();

  useEffect(() => {
    /* Handling Browser compatibility, Local device access & add Stream  */
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        localVideo.current.srcObject = stream;
        localVideo.current.volume = 0;
        console.log(`>>> Stream ${stream.id} added to localVideo`);

        localStream.current = stream;
        console.log(`>>> Stream assigned to localStream (local stream)`);

        /* Connecting SOCKETIO client<->server */
        socketRef.current = io("http://localhost:8081"); // "http://localhost:8081"

        /* CREATE OR JOIN room */
        const room = props.match.params.roomId;
        if (room) {
          socketRef.current.emit("createOrJoinRoom", room);

          socketRef.current.on("userJoinedRoom", (joinerId) => {
            console.log(`>>> User-${joinerId} just joined the chat`);
            handleCall(joinerId);
            remoteStream.current = joinerId;
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
      });
  }, []);

  /* HANDLING CALL */
  const handleCall = (joinerId) => {
    peerRef.current = handleCreatePeerConnection(joinerId);

    /* CREATE DATACHANNEL */
    sendChannel.current = peerRef.current.createDataChannel("sendChannel");
    console.log(">>> DataChannel is ready!");
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
      { id: uuidv4(), sender: "remote", value: ev.data },
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

  /* HANDLING ONLEAVE */
  const handleOnLeave = () => {
    // remoteStream.current = null;
    // remoteVideo.current.srcObject = null;
    // peerConnection.current.close();
    // peerConnection.current.onicecandidate = null;
    // peerConnection.current.ontrack = null;
    // socketRef.current.emit("disconnecting", peerConnection.current);
    // TODO
    // 1. Finish onLeave(server) & Deploy (NO push to github)
    // 2. Implement text-chat
    // 3. Implement screen share
    // 4. Implement group-call
  };

  const handleChange = (ev) => {
    setInputValue(ev.target.value);
  };

  const handleSendMessage = (ev) => {
    ev.preventDefault();
    sendChannel.current.send(inputValue);
    setAllMessages((messages) => [
      ...messages,
      { id: uuidv4(), sender: "local", value: inputValue },
    ]);
    console.log(allMessages);
    setInputValue("");
  };

  /* HANDLING SCREENSHARING */
  const handleScreenShare = () => {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
      const screenTrack = stream.getTracks()[0];
      console.log("screen track:", screenTrack);
      console.log(">>> Senders:", senders.current);

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
    <div className="container">
      <video className="local" ref={localVideo} autoPlay></video>
      <video className="remote" ref={remoteVideo} autoPlay></video>
      <button className="leave-chat-btn" onClick={handleOnLeave}>
        Leave Room
      </button>
      <button onClick={handleScreenShare}>Share screen</button>
      <div>
        <div id="all-messages">
          {allMessages.map((message) => (
            <div key={message.id}>
              <span>{message.sender}</span>
              <p>{message.value}</p>
            </div>
          ))}
        </div>
        <div>
          <input type="text" value={inputValue} onChange={handleChange} />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Room;
