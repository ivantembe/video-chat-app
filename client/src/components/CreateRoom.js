import React from "react";
import { v4 as uuidv4 } from "uuid";

function CreateRoom(props) {
  const handleCreateRoom = () => {
    const roomId = uuidv4();
    props.history.push(`/room/:${roomId}`);
  };
  return (
    <div>
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
}

export default CreateRoom;
