import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BodyProgressCard from '../components/Dashboard/BodyProgressCard';
import { BODY_LOG_KEY, BODY_PHOTO_KEY, sanitizeBodyLog } from '../utils/bodyProgress';

const TODAY = new Date(2026, 10, 15, 10, 0, 0);
const DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const LOG = sanitizeBodyLog([
  { date: '2026-10-04', weightKg: 84, waistCm: 92, armCm: 36 },
  { date: '2026-10-18', weightKg: 83, waistCm: 90.5, armCm: 36.5 },
  { date: '2026-11-01', weightKg: 82, waistCm: 89, armCm: 37 }
]);

const PHOTOS = [
  { id: 'p-old', date: '2026-10-04', dataUrl: DATA_URL, createdAt: 1 },
  { id: 'p-new', date: '2026-11-01', dataUrl: DATA_URL, createdAt: 2 }
];

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('BodyProgressCard', () => {
  it('renders the empty baseline, insight and disabled chart state', () => {
    render(<BodyProgressCard today={TODAY} goal="fatloss" initialLog={[]} initialPhotos={[]} />);
    expect(screen.getByTestId('body-progress-card')).toBeInTheDocument();
    expect(screen.getByTestId('bp-stat-weight')).toHaveTextContent('—');
    expect(screen.getByTestId('bp-stat-checkins')).toHaveTextContent('0');
    expect(screen.getByTestId('bp-insight')).toHaveAttribute('data-status', 'starting');
    expect(screen.getByTestId('bp-chart-empty')).toHaveTextContent(/second weight measurement/i);
  });

  it('summarises weight, waist and check-ins from the log', () => {
    render(<BodyProgressCard today={TODAY} goal="fatloss" initialLog={LOG} initialPhotos={[]} />);
    expect(screen.getByTestId('bp-stat-weight')).toHaveTextContent('82');
    expect(screen.getByTestId('bp-stat-waist')).toHaveTextContent('89');
    expect(screen.getByTestId('bp-stat-checkins')).toHaveTextContent('3');
    expect(screen.getByTestId('bp-insight')).toHaveAttribute('data-status', 'ontrack');
  });

  it('renders metric tiles with the delta since the first log', () => {
    render(<BodyProgressCard today={TODAY} initialLog={LOG} initialPhotos={[]} />);
    expect(screen.getByTestId('bp-metric-weightKg')).toHaveTextContent('82');
    expect(screen.getByTestId('bp-metric-weightKg')).toHaveTextContent('-2 kg');
    expect(screen.getByTestId('bp-metric-waistCm')).toHaveTextContent('-3 cm');
    expect(screen.getByTestId('bp-metric-armCm')).toHaveTextContent('+1 cm');
    expect(screen.getByTestId('bp-metric-thighCm')).toHaveTextContent('first log');
  });

  it('draws a trend and switches metric when a tile is selected', () => {
    render(<BodyProgressCard today={TODAY} initialLog={LOG} initialPhotos={[]} />);
    expect(screen.getByRole('img', { name: /Weight trend/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bp-metric-waistCm'));
    expect(screen.getByRole('img', { name: /Waist trend/i })).toBeInTheDocument();
    expect(screen.getByTestId('bp-metric-waistCm')).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves a measurement, updates the card and persists it locally', () => {
    const onNotify = vi.fn();
    render(<BodyProgressCard today={TODAY} initialLog={[]} initialPhotos={[]} onNotify={onNotify} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: /Weight/ }), { target: { value: '79.4' } });
    fireEvent.change(screen.getByLabelText(/Waist/), { target: { value: '87' } });
    fireEvent.click(screen.getByTestId('bp-save'));

    expect(screen.getByTestId('bp-stat-weight')).toHaveTextContent('79.4');
    expect(screen.getByTestId('bp-stat-waist')).toHaveTextContent('87');
    expect(screen.getByTestId('bp-save-note')).toHaveTextContent(/Saved Nov 15/i);
    expect(screen.getByTestId('bp-insight')).toHaveAttribute('data-status', 'starting');
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('Measurements saved'), 'success');

    const stored = JSON.parse(localStorage.getItem(BODY_LOG_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe('2026-11-15');
    expect(stored[0].weightKg).toBe(79.4);
  });

  it('merges a same-day save with the existing entry', () => {
    render(<BodyProgressCard today={TODAY} initialLog={LOG} initialPhotos={[]} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Weight/ }), { target: { value: '81.5' } });
    fireEvent.click(screen.getByTestId('bp-save'));
    expect(screen.getByTestId('bp-stat-checkins')).toHaveTextContent('3');
    expect(screen.getByTestId('bp-stat-weight')).toHaveTextContent('81.5');
    expect(screen.getByTestId('bp-stat-waist')).toHaveTextContent('89');
  });

  it('validates empty and out-of-range submissions', () => {
    render(<BodyProgressCard today={TODAY} initialLog={[]} initialPhotos={[]} />);
    fireEvent.click(screen.getByTestId('bp-save'));
    expect(screen.getByTestId('bp-form-error')).toHaveTextContent(/at least one measurement/i);

    fireEvent.change(screen.getByRole('spinbutton', { name: /Weight/ }), { target: { value: '999' } });
    fireEvent.click(screen.getByTestId('bp-save'));
    expect(screen.getByTestId('bp-form-error')).toHaveTextContent(/between 25 and 350/i);
  });

  it('opens the photos tab with a private empty state', () => {
    render(<BodyProgressCard today={TODAY} initialLog={LOG} initialPhotos={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: /Photos/ }));
    expect(screen.getByTestId('bp-photo-empty')).toHaveTextContent(/No progress photos yet/i);
    expect(screen.getByLabelText('Add progress photo')).toBeInTheDocument();
  });

  it('uploads a photo, stores it and shows it in the gallery', async () => {
    render(<BodyProgressCard today={TODAY} initialLog={[]} initialPhotos={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: /Photos/ }));
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'progress.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Add progress photo'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByTestId('bp-stat-photos')).toHaveTextContent('1'));
    expect(within(screen.getByTestId('bp-photo-grid')).getAllByRole('img')).toHaveLength(1);
    expect(screen.getByLabelText(/Delete photo from Nov 15/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(BODY_PHOTO_KEY))).toHaveLength(1);
  });

  it('shows a two-photo compare slider and day gap', () => {
    render(<BodyProgressCard today={TODAY} initialLog={LOG} initialPhotos={PHOTOS} />);
    fireEvent.click(screen.getByRole('tab', { name: /Photos/ }));
    const compare = screen.getByTestId('bp-compare');
    expect(compare).toBeInTheDocument();
    expect(screen.getByLabelText('Before photo')).toHaveValue('p-old');
    expect(screen.getByLabelText('After photo')).toHaveValue('p-new');
    expect(screen.getByText('28 days apart')).toBeInTheDocument();
    expect(screen.getByLabelText('Reveal before photo')).toHaveValue('50');
  });

  it('requires confirmation before deleting a photo', () => {
    render(<BodyProgressCard today={TODAY} initialLog={[]} initialPhotos={PHOTOS} />);
    fireEvent.click(screen.getByRole('tab', { name: /Photos/ }));

    fireEvent.click(screen.getByLabelText('Delete photo from Nov 1'));
    expect(screen.getByTestId('bp-delete-confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.queryByTestId('bp-delete-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('bp-stat-photos')).toHaveTextContent('2');

    fireEvent.click(screen.getByLabelText('Delete photo from Nov 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByTestId('bp-stat-photos')).toHaveTextContent('1');
    expect(screen.queryByTestId('bp-compare')).not.toBeInTheDocument();
  });

  it('builds the timeline with month groups, measurement chips and photos', () => {
    render(<BodyProgressCard today={TODAY} initialLog={LOG} initialPhotos={PHOTOS} />);
    fireEvent.click(screen.getByRole('tab', { name: /Timeline/ }));
    const timeline = screen.getByTestId('bp-timeline');
    expect(within(timeline).getByText('Nov 2026')).toBeInTheDocument();
    expect(within(timeline).getByText('Oct 2026')).toBeInTheDocument();
    expect(within(timeline).getByText('Nov 1')).toBeInTheDocument();
    expect(within(timeline).getAllByText(/Weight/).length).toBeGreaterThan(0);
    expect(within(timeline).getAllByRole('img')).toHaveLength(2);
  });

  it('shows the timeline empty state without data', () => {
    render(<BodyProgressCard today={TODAY} initialLog={[]} initialPhotos={[]} />);
    fireEvent.click(screen.getByRole('tab', { name: /Timeline/ }));
    expect(screen.getByTestId('bp-timeline-empty')).toHaveTextContent(/timeline builds itself/i);
  });

  it('prefills the weight field from the profile', () => {
    render(<BodyProgressCard today={TODAY} initialWeight={74} initialLog={[]} initialPhotos={[]} />);
    expect(screen.getByRole('spinbutton', { name: /Weight/ })).toHaveValue(74);
  });
});
