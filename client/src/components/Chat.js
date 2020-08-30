import React from "react";
import Button from "./shared/Button";
import Message from "./shared/Message";

function Chat({
  allMessages,
  inputValue,
  handleChange,
  disabled,
  handleSendMessage,
}) {
  return (
    <div className="chat">
      <div className="chat__title">
        <span>Chat</span>
      </div>
      <div className="chat__messages">
        {allMessages.map((message) => (
          <Message message={message} />
        ))}
      </div>
      <div className="input--group">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          disabled={disabled}
        />
        <Button
          label="Send"
          className="btn--blue w-5"
          handleClick={handleSendMessage}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default Chat;
