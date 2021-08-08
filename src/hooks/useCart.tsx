import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const checkThereIsProductInStock = await api.get<Stock>(`/stock/${productId}`);

      if(checkThereIsProductInStock.data.amount <= 0){
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const checkExistProductInCart = cart.find(product => product.id === productId);

      let products;

      if(checkExistProductInCart){

        if(checkExistProductInCart.amount + 1 > checkThereIsProductInStock.data.amount){
          toast.error('Quantidade solicitada fora de estoque');

          return;
        }

        products = cart.map(product => {
          if(product.id === productId){
            return { ...product, amount: product.amount + 1 }
          }

          return product;
        });

        setCart(products);
      }else{
        const product = await api.get<Product>(`/products/${productId}`);

        products = [...cart, { ...product.data, amount: 1}];

        setCart(products);
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));

    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existProduct = cart.find(product => product.id === productId);

      if(!existProduct){
        toast.error("Erro na remoção do produto");

        return;
      }

      const products = cart.filter(product => product.id !== productId);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));

      setCart(products);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const checkThereIsProductInStock = await api.get<Stock>(`/stock/${productId}`);
      
      if(amount + 1 > checkThereIsProductInStock.data.amount){
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const products = cart.map(product => {
        if(product.id === productId){
          return {
            ...product,
            amount
          }
        }

        return product;
      });

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(products));

      setCart(products);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
