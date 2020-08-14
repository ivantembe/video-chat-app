import React from "react";
import { v4 as uuidv4 } from "uuid";

function CreateRoom(props) {
  const handleCreateRoom = () => {
    const id = uuidv4();
    props.history.push(`/room/${id}`);
  };
  return (
    <div>
      <button onClick={handleCreateRoom}>Create Room</button>
    </div>
  );
}

export default CreateRoom;
