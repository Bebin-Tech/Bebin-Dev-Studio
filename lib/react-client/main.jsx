import './styles.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';

class AppErrorBoundary extends React.Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    return this.state.failed ? <main><h1>Unable to display this application</h1><p>Refresh to retry. If the problem continues, contact the application administrator.</p><button onClick={() => location.reload()}>Refresh</button></main> : this.props.children;
  }
}

createRoot(document.getElementById('application')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
