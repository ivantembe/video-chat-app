import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import "./styles.css";

function Room(props) {
  const localVideo = useRef();
  const remoteVideo = useRef();
  const peerConnectionRef = useRef();
  const socketRef = useRef();
  const otherUser = useRef();
  const userStream = useRef();
  const [videoWindowSize, setVideWindowSize] = useState("local-video");
  const [remoteVideoWindow, setRemoteVideoWindow] = useState("");

  useEffect(() => {
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        localVideo.current.srcObject = stream;
        userStream.current = stream;
        console.log("--> Local video stream:", stream);

        socketRef.current = io();
        socketRef.current.emit("joinRoom", props.match.params.roomID);

        socketRef.current.on("otherUser", (userId) => {
          handleCall(userId);
          otherUser.current = userId;
        });

        socketRef.current.on("otherUserJoined", (userId) => {
          otherUser.current = userId;
        });

        socketRef.current.on("offer", handleRecieveCall);
        socketRef.current.on("answer", handleAnswer);
        socketRef.current.on("iceCandidate", handleNewICECandidateData);
      });
  }, []);

  const handleCall = (userId) => {
    peerConnectionRef.current = handleCreatePeerConnection(userId);
    userStream.current
      .getTracks()
      .forEach((track) =>
        peerConnectionRef.current.addTrack(track, userStream.current)
      );
  };

  const handleCreatePeerConnection = (userId) => {
    const iceConfiguration = {
      iceServers: [
        {
          urls: ["turns:turnserver.example.org", "turn:turnserver.example.org"],
          username: "webrtc",
          credential: "turnpassword",
        },
      ],
    };

    const peerConnection = new RTCPeerConnection(iceConfiguration);
    peerConnection.onicecandidate = handleOnIceCandidate;
    peerConnection.ontrack = handleOnTrack;
    peerConnection.onnegotiationneeded = () =>
      handleOnNegotiationNeeded(userId);

    return peerConnection;
  };

  const handleOnNegotiationNeeded = (userId) => {
    peerConnectionRef.current.createOffer().then((offer) => {
      return peerConnectionRef.current
        .setLocalDescription(offer)
        .then(() => {
          const payload = {
            target: userId,
            caller: socketRef.current.id,
            sdp: peerConnectionRef.current.localDescription,
          };
          socketRef.current.emit("offer", payload);
        })
        .catch((e) => console.log(e));
    });
  };

  const handleRecieveCall = (incomingCall) => {
    peerConnectionRef.current = handleCreatePeerConnection();
    const desc = new RTCSessionDescription(incomingCall.sdp);
    peerConnectionRef.current
      .setRemoteDescription(desc)
      .then(() => {
        userStream.current
          .getTracks()
          .forEach((track) =>
            peerConnectionRef.current.addTrack(track, userStream.current)
          );
      })
      .then(() => {
        return peerConnectionRef.current.createAnswer();
      })
      .then((answer) => {
        return peerConnectionRef.current.setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: incomingCall.caller,
          caller: socketRef.current.id,
          sdp: peerConnectionRef.current.localDescription,
        };
        socketRef.current.emit("answer", payload);
      });
  };

  const handleAnswer = (data) => {
    const desc = new RTCSessionDescription(data.sdp);
    peerConnectionRef.current
      .setRemoteDescription(desc)
      .catch((e) => console.log(e));
  };

  const handleOnIceCandidate = (e) => {
    if (e.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: e.candidate,
      };
      socketRef.current.emit("iceCandidate", payload);
    }
  };

  const handleNewICECandidateData = (incomingObj) => {
    const candidate = new RTCIceCandidate(incomingObj);

    peerConnectionRef.current
      .addIceCandidate(candidate)
      .catch((e) => console.log(e));
  };

  const handleOnTrack = (e) => {
    remoteVideo.current.srcObject = e.streams[0];
    setVideWindowSize("mini-video");
    setRemoteVideoWindow("remote-video");
  };

  return (
    <div className="room-container">
      <div className="videos-container">
        {remoteVideoWindow === "" ? (
          <span ref={remoteVideo} />
        ) : (
          <video className={remoteVideoWindow} autoPlay ref={remoteVideo} />
        )}
        <video className={videoWindowSize} autoPlay ref={localVideo} />
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <b>Chat</b>
        </div>
        <div className="chat-output"></div>
        <div className="chat-input">start typing...</div>
      </div>
    </div>
  );
}

export default Room;
