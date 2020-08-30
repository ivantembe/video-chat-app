import React from "react";
import { v4 as uuidv4 } from "uuid";
import { BrowserRouter, Link } from "react-router-dom";

const CreateRoom = (props) => {
  const handleCreateRoom = () => {
    const roomId = uuidv4();
    props.history.push(`/room/:${roomId}`);
  };

  return (
    <BrowserRouter>
      <div className="create-room">
        <div className="create-room--container">
          <h1>Welcome!</h1>
          <p>
            This <b>demo app</b> is part of my <b>web development</b> bachelor
            project. My goal with this project was mainly exploring and
            understanding the complexity of implementing real-time audio, video,
            and data communication via the web browser using WebRTC native API.
            <a
              href="https://documentcloud.adobe.com/link/review?uri=urn:aaid:scds:US:2f14da36-601c-42a2-8258-5dc00d2ddb65"
              target="_blank"
              className="link"
            >
              {" "}
              <span>Read Thesis >></span>
            </a>
          </p>
          <p>This demo app covers four core features:</p>
          <ul>
            <li>Video and audio call between two peers</li>
            <li>Text-based chat</li>
            <li>Screen sharing</li>
            <li>Signaling</li>
          </ul>

          <p>
            To get started, hit the <b>create room</b> button, then copy the
            <b> URL</b> from your browser and <b>send</b> it over to the person
            whom you wish to call. That's it!
          </p>
          <button className="btn btn--blue" onClick={handleCreateRoom}>
            Create Room
          </button>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default CreateRoom;
