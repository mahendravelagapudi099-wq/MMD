import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from '../components/Login';
import * as firebaseUtils from '../utils/firebase';

vi.mock('../utils/firebase', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        signInUser: vi.fn(),
        signUpUser: vi.fn(),
        getAuthErrorMessage: vi.fn(() => 'Mock Error'),
    };
});

const renderLogin = () => {
    return render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
};

describe('Login Component', () => {
    it('renders login form by default', () => {
        renderLogin();
        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    });

    it('shows validation error for short password on signup', async () => {
        renderLogin();
        fireEvent.click(screen.getByText(/Sign Up/i));

        const emailInput = screen.getByPlaceholderText(/you@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/i);
        const submitBtn = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: '123' } }); // too short
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
        });
    });

    it('calls signInUser on form submission (login mode)', async () => {
        renderLogin();
        const emailInput = screen.getByPlaceholderText(/you@example.com/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/i);
        const submitBtn = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(firebaseUtils.signInUser).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });
});
