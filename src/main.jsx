import React from 'react'
import ReactDOM from 'react-dom/client'
import './firebase.js'
import RushApp from '../rush-app.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RushApp />
  </React.StrictMode>,
)
