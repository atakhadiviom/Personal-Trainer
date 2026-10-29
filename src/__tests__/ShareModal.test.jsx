import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareModal from '../components/Dashboard/ShareModal';

describe('ShareModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ShareModal isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders transformation card details when isOpen is true', () => {
    render(<ShareModal isOpen={true} week={3} totalWeeks={12} completedCount={9} />);

    expect(screen.getByTestId('share-modal-card')).toBeInTheDocument();
    expect(screen.getByText(/WEEK 3 CRUSHED/i)).toBeInTheDocument();
    expect(screen.getByText('3/12 Wks')).toBeInTheDocument();
    expect(screen.getByText('9 logged')).toBeInTheDocument();
    expect(screen.getByText(/25% Complete/i)).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<ShareModal isOpen={true} week={2} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText(/close share modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('opens WhatsApp share URL on WhatsApp button click', () => {
    const originalOpen = window.open;
    window.open = vi.fn();

    render(<ShareModal isOpen={true} week={4} />);
    const waBtn = screen.getByRole('button', { name: /share on whatsapp/i });
    fireEvent.click(waBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://api.whatsapp.com/send?text='),
      '_blank',
      'noopener,noreferrer'
    );

    window.open = originalOpen;
  });

  it('copies share text to clipboard and triggers onCopySuccess', async () => {
    const handleCopySuccess = vi.fn();
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    render(<ShareModal isOpen={true} week={5} onCopySuccess={handleCopySuccess} />);
    const copyBtn = screen.getByRole('button', { name: /copy text and link/i });
    fireEvent.click(copyBtn);

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Week 5'));
    // Wait for promise resolution
    await Promise.resolve();
    expect(handleCopySuccess).toHaveBeenCalledTimes(1);
  });
});
