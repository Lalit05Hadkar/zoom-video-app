import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the landing page', () => {
  render(<App />);
  expect(screen.getByText(/connect/i)).toBeInTheDocument();
  expect(screen.getByText(/get started/i)).toBeInTheDocument();
});
