import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-bold transition-transform active:translate-y-1 active:shadow-none border-2 border-black rounded-xl px-4 py-2 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-brand-yellow text-black shadow-fun hover:bg-yellow-400",
    secondary: "bg-white text-black shadow-fun hover:bg-gray-50",
    ghost: "bg-transparent border-none shadow-none text-gray-600 hover:bg-gray-100",
    icon: "bg-brand-blue text-black shadow-fun-sm p-2 rounded-lg aspect-square",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};