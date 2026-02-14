import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
    it('renders without crashing', () => {
        expect(App).toBeDefined();
    });
});