import React from "react";

function Button({ label, className, handleClick, disabled }) {
  return (
    <button
      className={`btn ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export default Button;
