import { useReducer } from 'react';
import type { CartItem, Product } from '../../db/index.js';

// --- Actions ---

type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' };

// --- State ---

interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

// --- Reducer ---

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.productId === action.product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.productId === action.product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      // Preis-Snapshot zum Zeitpunkt des Hinzufügens — nie nachträglich aus DB aktualisieren
      const newItem: CartItem = {
        productId: action.product.id,
        articleNumber: action.product.articleNumber,
        name: action.product.name,
        salePrice: action.product.salePrice,
        quantity: 1,
      };
      return { items: [...state.items, newItem] };
    }

    case 'REMOVE_ITEM':
      return { items: state.items.filter(i => i.productId !== action.productId) };

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return { items: state.items.filter(i => i.productId !== action.productId) };
      }
      return {
        items: state.items.map(i =>
          i.productId === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case 'CLEAR':
      return initialState;

    default:
      return state;
  }
}

// --- Hook ---

export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const total = state.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);

  function addItem(product: Product) {
    dispatch({ type: 'ADD_ITEM', product });
  }

  function removeItem(productId: string) {
    dispatch({ type: 'REMOVE_ITEM', productId });
  }

  function updateQuantity(productId: string, quantity: number) {
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  }

  function clear() {
    dispatch({ type: 'CLEAR' });
  }

  return {
    items: state.items,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };
}
