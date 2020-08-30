import React from "react";

const Message = ({ message }) => {
  const sendLoc = "sender--local";
  const sendRem = "sender--remote";
  return (
    <div className="message" key={message.id}>
      <span className={message.sender === "local" ? sendLoc : sendRem}>
        {message.sender === "local" ? "Your Message" : "Remote Message"}
      </span>
      <span className="message__date">{message.date}</span>
      <p className="message__content">{message.value}</p>
    </div>
  );
};

export default Message;
