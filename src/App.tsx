
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import DataGenerator from './pages/DataGenerator';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Routes>
          <Route path="/" element={<DataGenerator />} />
          <Route path="/generator" element={<DataGenerator />} />
        </Routes>
        
        <Toaster 
          position="top-right"
          richColors
          closeButton
          expand={false}
          duration={4000}
        />
      </div>
    </Router>
  );
}

export default App;
