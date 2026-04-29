import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingAI from '../components/Wizard/LoadingAI';

describe('LoadingAI Component', () => {
  it('renders the loading message without crashing', () => {
    render(<LoadingAI />);

    // Check if the main title is rendered
    expect(screen.getByText('Designing Your Program...')).toBeInTheDocument();

    // Check if the subtitle is rendered
    expect(screen.getByText(/NovaFit AI is analyzing your profile/i)).toBeInTheDocument();
  });
});
