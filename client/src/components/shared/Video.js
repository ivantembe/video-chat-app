import React from "react";

function Video({ className, videoRef }) {
  return <video className={className} ref={videoRef} autoPlay></video>;
}

export default Video;
