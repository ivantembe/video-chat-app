import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

function Room(props) {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerRef = useRef();
  const peerConnection = useRef();
  const socketRef = useRef();
  const localStream = useRef();
  const remoteStream = useRef();

  const [allMessages, setAllMessages] = useState();
  const [inputValue, setInputValue] = useState("");
  // const dataChannel = useRef();

  const senders = useRef([]);

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
        console.log(`>>> Stream ${stream.id} added to localVideo`);

        localStream.current = stream;
        console.log(`>>> Stream assigned to localStream (local stream)`);

        /* Connecting SOCKETIO client<->server */
        socketRef.current = io("http://localhost:8081");

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

        /* OFFER, ANSWER & ICECANDIDATE LISTNERS */
        socketRef.current.on("offer", handleRecieveCall);
        socketRef.current.on("answer", handleAnswer);
        socketRef.current.on("iceCandidate", handleNewICECandidateData);
      });
  }, []);

  /* HANDLING CALL */
  const handleCall = (joinerId) => {
    peerRef.current = handleCreatePeerConnection(joinerId);
    localStream.current
      .getTracks()
      .forEach((track) =>
        senders.current.push(
          peerRef.current.addTrack(track, localStream.current)
        )
      );
  };

  /* HANDLING PEERCONNECTION */
  const handleCreatePeerConnection = (joinerId) => {
    const iceConfiguration = {
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org",
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
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

  /* DATACHANNEL */
  //  const dataChannel = peerConnection.current.createDataChannel({
  //   reliable: true,
  // });
  // peerConnection.current.ondatachannel = dataChannel;
  // dataChannel.onopen = () => console.log(">>> Channel is ready!");
  // dataChannel.onclose = () => console.log(">>> Channel is closed!");
  // dataChannel.onmessage = (ev) => {
  //   const message = ev.data;
  //   setAllMessages(message);
  // };

  /* HANDLING RECIEVECALL & EMMIT ANSWER */
  const handleRecieveCall = (incomingCall) => {
    peerRef.current = handleCreatePeerConnection();
    const desc = new RTCSessionDescription(incomingCall.sdp);
    peerRef.current
      .setRemoteDescription(desc)
      .then(() => {
        localStream.current
          .getTracks()
          .forEach((track) =>
            peerRef.current.addTrack(track, localStream.current)
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
    peerRef.current.addIceCandidate(candidate).catch((e) => console.log(e));
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
    const message = inputValue;
    // dataChannel.current.send(message);
  };

  /* HANDLING SCREENSHARING */
  const handleScreenShare = () => {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
      const screenTrack = stream.getTracks()[0];
      senders.current
        .find((sender) => sender.track.kind === "video")
        .replaceTrack(screenTrack);
      screenTrack.onended = function () {
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
        <div id="all-messages">{allMessages}</div>
        <div>
          <input type="text" value={inputValue} onChange={handleChange} />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Room;
