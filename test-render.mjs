import React from 'react';
import { renderToString } from 'react-dom/server';
import SolicitudForm from './src/components/SolicitudForm.jsx';

try {
  const html = renderToString(React.createElement(SolicitudForm, {}));
  console.log("RENDER SUCCESS!");
} catch (e) {
  console.error("RENDER ERROR:", e);
}
