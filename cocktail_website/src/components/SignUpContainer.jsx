import React, { useState } from 'react';

function SignUpContainer({ active, close, switchToSignIn }) {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Sikeres regisztráció! Most már bejelentkezhetsz.");
    switchToSignIn();
  };

  return (
    <div className={`sign_in_sign_up_container ${active ? 'active' : ''}`} onClick={close}>
      <div className="sign_in_sign_up_overlay">
        <div className={`sign_up_content ${active ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
          <h1 className="sign_up_title">Sign Up</h1>
          <form className="sign_up_form" onSubmit={handleSubmit}>
            <input 
              type="text" 
              name="username" 
              className="sign_up_input"
              value={userData.username} 
              onChange={handleChange} 
              placeholder="Username" 
              required 
            />
            <input 
              type="email" 
              name="email"
              value={userData.email} 
              onChange={handleChange} 
              className="sign_up_input" 
              placeholder="Email" 
              required 
            />
            <input 
              type="password" 
              name="password"
              value={userData.password} 
              onChange={handleChange} 
              className="sign_up_input" 
              placeholder="Password" 
              required 
            />
            <button type="submit" className="sign_up_btn">Sign Up</button>
          </form>
          <p className="sign_up_info">
            Already have an account?{" "}
            <a href="#signin" onClick={(e) => { e.preventDefault(); switchToSignIn(); }}>
              Sign In
            </a>
          </p>
          <div className="sign_up_close" onClick={close}>
            <i className="ri-close-line"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpContainer;