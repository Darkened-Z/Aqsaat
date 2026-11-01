import React from 'react';
import App from './index';

export default function DemoPage(props) {
  return <App {...props} forceDemo={true} />;
}
