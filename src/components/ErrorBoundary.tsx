// Catches render errors in one route so a broken page shows a fallback
// instead of unmounting the whole app (blank/black screen with no nav).
// Added after /realm crashed the entire tree because a Leaflet hook was
// used outside its MapContainer — without a boundary, one bad page killed
// every page, including back-navigation.
import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Something went wrong on this page
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {this.state.error.message}
          </Typography>
          <Button variant="contained" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
