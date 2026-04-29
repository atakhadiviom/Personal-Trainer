import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingAI from '../components/Wizard/LoadingAI';

describe('LoadingAI Component', () => {
  it('renders the loading message without crashing', () => {
    render(<LoadingAI />);
    expect(screen.getByText('Designing Your Program...')).toBeInTheDocument();

    // Also verify the subtitle is present
    expect(screen.getByText(/NovaFit AI is analyzing your profile/)).toBeInTheDocument();
  });
});
