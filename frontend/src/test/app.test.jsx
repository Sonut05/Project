import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import ReceiptModal from '../components/ReceiptModal';
import Auth from '../components/Auth';
import ItemCard from '../components/ItemCard';
import Navbar from '../components/Navbar';
import AddEditItemModal from '../components/AddEditItemModal';
import ItemDetail from '../pages/ItemDetail';
import Browse from '../pages/Browse';
import ProfileView from '../components/ProfileView';
import { itemsApi } from '../api/items';
import {
  getTodayString,
  addDaysToDateString,
  calculateRentalDays,
  isDateRangeOverlapping,
  formatRelativeTime
} from '../utils/dateUtils';

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn()
      }
    },
    map: () => ({
      setView: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      flyTo: vi.fn()
    }),
    tileLayer: () => ({
      addTo: vi.fn()
    }),
    marker: () => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn(),
      setLatLng: vi.fn()
    }),
    circle: () => ({
      addTo: vi.fn().mockReturnThis(),
      setLatLng: vi.fn(),
      setRadius: vi.fn(),
      setStyle: vi.fn()
    }),
    divIcon: vi.fn(),
    layerGroup: () => ({
      addTo: vi.fn().mockReturnThis(),
      clearLayers: vi.fn(),
      addLayer: vi.fn()
    }),
    control: {
      zoom: () => ({
        addTo: vi.fn()
      })
    }
  }
}));

// Mock authApi
vi.mock('../api/auth.js', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn().mockResolvedValue({ accessToken: null }),
    getMe: vi.fn()
  }
}));

// Mock requestsApi
vi.mock('../api/requests.js', () => ({
  requestsApi: {
    getIncoming: vi.fn().mockResolvedValue([]),
    getOutgoing: vi.fn().mockResolvedValue([]),
    createRequest: vi.fn(),
    acceptRequest: vi.fn(),
    rejectRequest: vi.fn(),
    cancelRequest: vi.fn(),
    returnRequest: vi.fn()
  }
}));

// Mock itemsApi
vi.mock('../api/items.js', () => ({
  itemsApi: {
    getItems: vi.fn().mockResolvedValue([]),
    getItemById: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn()
  }
}));

// Mock usersApi and uploadApi
vi.mock('../api/users.js', () => ({
  usersApi: {
    getProfile: vi.fn().mockResolvedValue({
      id: 'user-test-1',
      name: 'Anita Roy',
      email: 'anita@example.com',
      avatarUrl: '/avatar-placeholder.svg',
      city: 'Koramangala, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245,
      stats: { rating: 5, itemsCount: 2, completedLends: 1, completedBorrows: 0 }
    }),
    getUserListings: vi.fn().mockResolvedValue([]),
    getUserReviews: vi.fn().mockResolvedValue([]),
    updateMe: vi.fn().mockResolvedValue({
      user: {
        id: 'user-test-1',
        name: 'Anita Roy',
        avatarUrl: '/uploads/new-photo.jpg'
      }
    })
  }
}));

vi.mock('../api/upload.js', () => ({
  uploadApi: {
    uploadImage: vi.fn().mockResolvedValue({ url: '/uploads/new-photo.jpg' })
  }
}));

// Mock useAuth
const mockUser = {
  id: 'user-test-1',
  name: 'Anita Roy',
  email: 'anita@example.com',
  city: 'Koramangala, Bengaluru',
  onboardingCompletedAt: new Date().toISOString()
};

let currentMockUser = null;

vi.mock('../context/useAuth.js', () => ({
  useAuth: () => ({
    user: currentMockUser,
    loading: false,
    error: null,
    login: vi.fn().mockResolvedValue(mockUser),
    register: vi.fn().mockResolvedValue(mockUser),
    logout: vi.fn().mockImplementation(() => {
      currentMockUser = null;
    }),
    updateUser: vi.fn()
  })
}));

describe('Date Utilities Suite', () => {
  it('generates a valid YYYY-MM-DD date string for today', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('accurately adds days to a date string without timezone shifts', () => {
    const nextWeek = addDaysToDateString('2026-03-01', 7);
    expect(nextWeek).toBe('2026-03-08');
  });

  it('calculates rental duration inclusively', () => {
    const singleDay = calculateRentalDays('2026-04-10', '2026-04-10');
    expect(singleDay).toBe(1);

    const threeDays = calculateRentalDays('2026-04-10', '2026-04-12');
    expect(threeDays).toBe(3);
  });

  it('detects date range collisions correctly', () => {
    // Overlapping ranges
    expect(isDateRangeOverlapping('2026-05-01', '2026-05-05', '2026-05-03', '2026-05-08')).toBe(true);
    expect(isDateRangeOverlapping('2026-05-03', '2026-05-08', '2026-05-01', '2026-05-05')).toBe(true);

    // Non-overlapping ranges
    expect(isDateRangeOverlapping('2026-05-01', '2026-05-04', '2026-05-05', '2026-05-10')).toBe(false);
  });

  it('formats relative time stamps properly', () => {
    const justNow = formatRelativeTime(Date.now() - 10000);
    expect(justNow).toBe('Just now');

    const minutesAgo = formatRelativeTime(Date.now() - 5 * 60 * 1000);
    expect(minutesAgo).toBe('5m ago');
  });
});

describe('ConfirmModal Component', () => {
  it('renders modal with title and message when open', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Listing"
        message="Are you sure you want to remove this item?"
        confirmText="Yes, Delete"
        isDanger={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Delete Listing')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to remove this item?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Yes, Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ConfirmModal
        isOpen={false}
        title="Hidden"
        message="Should not show"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ReceiptModal Component', () => {
  it('renders receipt with correct financial breakdown and print option', () => {
    const mockRequest = {
      id: 'req-12345',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      totalDays: 3,
      rentalAmount: 1500,
      depositAmount: 2000,
      totalAmount: 3500,
      status: 'Completed',
      item: {
        id: 'item-1',
        name: 'Sony A7 IV Camera',
        dailyPrice: 500,
        depositAmount: 2000,
        images: ['https://example.com/cam.jpg']
      },
      lender: {
        id: 'lender-1',
        name: 'Anita Roy'
      },
      borrower: {
        id: 'borrower-1',
        name: 'Karan Mehra'
      }
    };

    render(<ReceiptModal request={mockRequest} onClose={() => {}} />);

    expect(screen.getByText('Sony A7 IV Camera')).toBeInTheDocument();
    expect(screen.getByText('₹1500')).toBeInTheDocument();
    expect(screen.getByText('₹2000')).toBeInTheDocument();
    expect(screen.getByText('₹3500')).toBeInTheDocument();
    expect(screen.getByText(/Print \/ Save as PDF/i)).toBeInTheDocument();
  });
});

describe('Auth Component', () => {
  beforeEach(() => {
    currentMockUser = null;
  });

  it('renders login form by default and allows switching to register tab', () => {
    render(<Auth onLoginSuccess={() => {}} toast={() => {}} />);

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();

    // Switch to Register tab
    const registerTab = screen.getByRole('button', { name: /New Neighbor Registration/i });
    fireEvent.click(registerTab);

    expect(screen.getByRole('heading', { name: /Create Neighbor Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  it('shows validation error when register passwords mismatch', async () => {
    render(<Auth onLoginSuccess={() => {}} toast={() => {}} />);

    // Switch to Register
    fireEvent.click(screen.getByRole('button', { name: /New Neighbor Registration/i }));

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Password999' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });
});

describe('ItemCard Component', () => {
  it('renders item information and tags safely', () => {
    const item = {
      id: 'item-88',
      name: 'Bosch Cordless Drill',
      category: 'Power Tools',
      dailyPrice: 250,
      depositAmount: 1000,
      condition: 'Good',
      availability: 'Available',
      images: ['https://example.com/drill.jpg'],
      lender: {
        id: 'lender-1',
        name: 'Deepak Kumar',
        rating: 4.8
      }
    };

    render(
      <ItemCard
        item={item}
        onView={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
        onViewUser={() => {}}
      />
    );

    expect(screen.getByText('Bosch Cordless Drill')).toBeInTheDocument();
    expect(screen.getByText('Power Tools')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
    expect(screen.getByText('Deepak Kumar')).toBeInTheDocument();
  });
});

describe('Navbar Component', () => {
  it('renders navigation links and responsive structure for authenticated user', async () => {
    currentMockUser = mockUser;

    render(
      <BrowserRouter>
        <Navbar theme="light" toggleTheme={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Browse').length).toBeGreaterThan(0);
    expect(screen.getAllByText('My Items').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Requests').length).toBeGreaterThan(0);
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
  });
});

describe('ItemDetail Component - Booked Ranges & Availability', () => {
  it('displays selected date overlapping an accepted booked range as unavailable', async () => {
    currentMockUser = {
      id: 'borrower-99',
      name: 'Borrower Test'
    };

    const mockItem = {
      id: 'item-123',
      name: 'Drill Machine',
      category: 'Power Tools',
      condition: 'Good',
      dailyPrice: 200,
      depositAmount: 500,
      description: 'Heavy duty drill machine',
      lenderId: 'lender-different-user',
      lender: {
        id: 'lender-different-user',
        name: 'Lender John',
        avatarUrl: null
      },
      bookedRanges: [
        { startDate: '2026-10-10', endDate: '2026-10-15', status: 'Accepted' }
      ],
      reviews: []
    };

    itemsApi.getItemById.mockResolvedValue(mockItem);

    render(
      <BrowserRouter>
        <ItemDetail itemId="item-123" />
      </BrowserRouter>
    );

    // Wait for item to load
    await waitFor(() => {
      expect(screen.getByText('Drill Machine')).toBeInTheDocument();
    });

    // Enter overlapping date range: 2026-10-12 to 2026-10-14
    const startInput = screen.getByLabelText(/START DATE/i);
    const endInput = screen.getByLabelText(/END DATE/i);

    fireEvent.change(startInput, { target: { value: '2026-10-12' } });
    fireEvent.change(endInput, { target: { value: '2026-10-14' } });

    // Warning should appear and submit button should indicate unavailable
    await waitFor(() => {
      expect(screen.getByTestId('date-collision-warning')).toBeInTheDocument();
      expect(screen.getByText(/Selected dates are unavailable/i)).toBeInTheDocument();
      const submitBtn = screen.getByRole('button', { name: /Dates Unavailable/i });
      expect(submitBtn).toBeDisabled();
    });
  });
});

describe('Targeted Frontend Regression Tests (Section 30)', () => {
  it('AddEditItemModal presents condition options New, Good, Fair and never Like New', () => {
    render(
      <BrowserRouter>
        <AddEditItemModal onClose={vi.fn()} onSave={vi.fn()} toast={{ error: vi.fn(), success: vi.fn() }} />
      </BrowserRouter>
    );

    const conditionSelect = screen.getByLabelText(/Condition/i);
    expect(conditionSelect).toBeInTheDocument();

    const options = Array.from(conditionSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).toEqual(['New', 'Good', 'Fair']);
    expect(options).not.toContain('Like New');
  });

  it('Auth UI specifies passwords are securely hashed on the server and does not claim encrypted credentials', () => {
    render(
      <BrowserRouter>
        <Auth onClose={vi.fn()} onSuccess={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Passwords are securely hashed on the server/i)).toBeInTheDocument();
    expect(screen.queryByText(/encrypted credentials/i)).not.toBeInTheDocument();
  });

  it('Image placeholder helper uses neutral local svg placeholder instead of stock photos', async () => {
    const { resolveImageUrl, ITEM_PLACEHOLDER, AVATAR_PLACEHOLDER } = await import('../utils/imageUrl.js');
    expect(ITEM_PLACEHOLDER).toBe('/item-placeholder.svg');
    expect(AVATAR_PLACEHOLDER).toBe('/avatar-placeholder.svg');

    expect(resolveImageUrl(null)).toBe('/item-placeholder.svg');
    expect(resolveImageUrl('')).toBe('/item-placeholder.svg');
    expect(resolveImageUrl(null, AVATAR_PLACEHOLDER)).toBe('/avatar-placeholder.svg');
  });

  it('Browse UI provides Anywhere search radius option', () => {
    render(
      <BrowserRouter>
        <Browse />
      </BrowserRouter>
    );

    expect(screen.getByText(/Search Radius/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anywhere/i })).toBeInTheDocument();
  });

  it('ProfileView provides profile photo upload option when editing', async () => {
    currentMockUser = mockUser;
    render(
      <BrowserRouter>
        <ProfileView userId="user-test-1" />
      </BrowserRouter>
    );

    const editBtn = await screen.findByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByText(/Profile Photo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload Photo/i })).toBeInTheDocument();
  });
});

