import React from "react";
import Button from "./shared/Button";
import Video from "./shared/Video";

const Streaming = ({
  localVideoSize,
  localVideo,
  remoteVideo,
  handleScreenShare,
  handleHangUp,
  disabled,
}) => {
  const strLoc = "stream--local";
  const strRem = "stream--remote";

  return (
    <div className="stream">
      <h1 className="stream__title">Major Project - Demo</h1>
      <Video
        videoRef={localVideo}
        className={localVideoSize ? strLoc : strRem}
      />
      <Video
        videoRef={remoteVideo}
        className={localVideoSize ? strRem : "hidden"}
      />

      <div className="stream__button--container">
        <Button
          label="Share screen"
          className="btn--blue mr-6"
          handleClick={handleScreenShare}
          disabled={disabled}
        />
        <Button
          label="End call"
          className="btn--red"
          handleClick={handleHangUp}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default Streaming;
