/** @vitest-environment jsdom */
/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CreditAnalysis from './CreditAnalysis.jsx';

// Mock react-query and API
vi.mock('react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => [vi.fn(), { isLoading: false }],
  useQueryClient: () => ({ invalidateQueries: vi.fn() })
}));
vi.mock('../services/api', () => ({
  creditAPI: {
    uploadReport: vi.fn(),
    getAnalysis: vi.fn(),
    getReports: vi.fn(() => []),
    addReport: vi.fn(),
    deleteReport: vi.fn(),
    generateDisputes: vi.fn(),
    downloadPDF: vi.fn(),
    refreshScores: vi.fn()
  }
}));

describe('CreditAnalysis Page', () => {
  it('renders the analysis form and simulator', () => {
    render(<CreditAnalysis />);
    expect(screen.getByText(/Credit Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Credit Score Simulator/i)).toBeInTheDocument();
  });

  it('allows user to input and simulate credit score', () => {
    render(<CreditAnalysis />);
    // Find and interact with simulator sliders/inputs
    // Use getByDisplayValue for utilization slider default value (20)
    const utilSlider = screen.getByDisplayValue('20');
    fireEvent.change(utilSlider, { target: { value: 5 } });
    expect(screen.getByText(/5%/)).toBeInTheDocument();
    expect(screen.getByText(/Simulated Score:/i)).toBeInTheDocument();
  });

  it('updates AI explanation when scenario buttons are clicked', () => {
    render(<CreditAnalysis />);
    const payOffBtns = screen.getAllByText(/Pay Off Card/i);
    fireEvent.click(payOffBtns[0]);
    expect(screen.getByText(/utilization is now below 10%/i)).toBeInTheDocument();
  });

  it('resets simulator values when Reset is clicked', () => {
    render(<CreditAnalysis />);
    const resetBtns = screen.getAllByText(/Reset/i);
    fireEvent.click(resetBtns[0]);
    expect(screen.getByText(/20%/)).toBeInTheDocument(); // Default utilization
  });
}); 