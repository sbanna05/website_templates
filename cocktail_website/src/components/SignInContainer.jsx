import React, { useState } from "react";

function SignInContainer({ active, close, switchToSignUp, onLogin }) {
  const [userData, setUserData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userData.username.trim() !== '') {
      onLogin({ username: userData.username });
    }
  };

  return (
    <div className={`sign_in_sign_up_container ${active ? "active" : ""}`} onClick={close}>
      <div className="sign_in_sign_up_overlay">
        <div
          className={`sign_in_content ${active ? "active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h1 className="sign_in_title">Sign In</h1>
          <form className="sign_in_form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleChange}
              className="sign_in_input"
              placeholder="Username"
              required
              autoComplete="username"
            />
            <input
              type="password"
              name="password"
              value={userData.password}
              onChange={handleChange}
              className="sign_in_input"
              placeholder="Password"
              required
              autoComplete="current-password"
            />
            <div className="remember_forgot">
              <label className="remember_me_label">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#forgot">Forgot Password?</a>
            </div>
            <button type="submit" className="sign_in_btn">
              Sign In
            </button>
          </form>
          <p className="sign_in_info">
            Don't have an account?{" "}
            <a href="#signup" onClick={(e) => { e.preventDefault(); switchToSignUp(); }}>
              Sign Up
            </a>
          </p>
          <div className="sign_in_close" onClick={close}>
            <i className="ri-close-line"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInContainer;