import React from "react";
import { v4 as uuidv4 } from "uuid";
import { Button, FlexboxGrid } from "rsuite";
import "./styles.css";

function CreateRoom(props) {
  const handleCreateRoom = () => {
    const id = uuidv4();
    props.history.push(`/room/${id}`);
  };
  return (
    <div className="container">
      <FlexboxGrid justify="center">
        <FlexboxGrid.Item colspan={16}>
          <h1>Real-Time Video Chat (WebRTC Native)</h1>
          <p className="mb-2 w-7">
            This web application is part of my major project.
            <br />
            The main goal was to develop from scratch a video chat web app using
            native WebRTC technology.
          </p>
          <Button className="mr-1" onClick={handleCreateRoom} color="blue">
            Create Room
          </Button>
          <Button color="blue" appearance="ghost">
            Documentation
          </Button>
        </FlexboxGrid.Item>
      </FlexboxGrid>
    </div>
  );
}

export default CreateRoom;
