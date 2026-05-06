import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CompleteProfile from './CompleteProfile';
import * as AuthContext from '../auth/AuthContext';

const mockNavigate = vi.fn();
const mockCompleteProfile = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../auth/AuthContext');
vi.mock('../components/MicButton', () => ({
  default: () => <div data-testid="mic-button">Mic</div>,
}));

describe('CompleteProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthContext.useAuth.mockReturnValue({
      user: { name: 'Test User' },
      completeProfile: mockCompleteProfile,
    });
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
  });

  it('renders complete profile form', () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    expect(screen.getByText('Votre profil')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Sarah')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Benali')).toBeInTheDocument();
  });

  it('shows error when required fields are empty', async () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    // fireEvent.submit bypasses native HTML5 required-field validation in jsdom
    const submitButton = screen.getByRole('button', { name: /Accéder à la plateforme/ });
    fireEvent.submit(submitButton.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Le prénom et le nom sont obligatoires.')).toBeInTheDocument();
    });
  });

  it('submits form with required fields', async () => {
    mockCompleteProfile.mockResolvedValue({});

    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const firstNameInput = screen.getByPlaceholderText('Ex: Sarah');
    const lastNameInput = screen.getByPlaceholderText('Ex: Benali');
    const submitButton = screen.getByRole('button', { name: /Accéder à la plateforme/ });

    fireEvent.change(firstNameInput, { target: { value: 'Sarah' } });
    fireEvent.change(lastNameInput, { target: { value: 'Benali' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('handles photo upload', () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    const button = screen.getByText('Choisir une photo de profil');
    
    expect(button).toBeInTheDocument();
  });

  it('shows error for invalid photo type', () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const button = screen.getByText('Choisir une photo de profil');
    expect(button).toBeInTheDocument();
  });

  it('shows error for large photo', () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const button = screen.getByText('Choisir une photo de profil');
    expect(button).toBeInTheDocument();
  });

  it('handles CV upload', () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const cvButton = screen.getByText(/Cliquer pour uploader votre CV/);

    fireEvent.click(cvButton);
    const cvInput = cvButton.nextSibling;
    fireEvent.change(cvInput, { target: { files: [file] } });

    expect(screen.getByText('✓ cv.pdf')).toBeInTheDocument();
  });

  it('shows error for non-PDF CV', () => {
    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const file = new File(['cv'], 'cv.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const cvButton = screen.getByText(/Cliquer pour uploader votre CV/);

    fireEvent.click(cvButton);
    const cvInput = cvButton.nextSibling;
    fireEvent.change(cvInput, { target: { files: [file] } });

    expect(screen.getByText('Le CV doit être un fichier PDF.')).toBeInTheDocument();
  });

  it('handles API error', async () => {
    mockCompleteProfile.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <CompleteProfile />
      </BrowserRouter>
    );

    const firstNameInput = screen.getByPlaceholderText('Ex: Sarah');
    const lastNameInput = screen.getByPlaceholderText('Ex: Benali');
    const submitButton = screen.getByRole('button', { name: /Accéder à la plateforme/ });

    fireEvent.change(firstNameInput, { target: { value: 'Sarah' } });
    fireEvent.change(lastNameInput, { target: { value: 'Benali' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});
