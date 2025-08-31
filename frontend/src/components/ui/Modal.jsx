import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    // Agregamos una animación simple con CSS para la entrada
    const modalAnimation = { animation: 'scaleIn 0.3s ease-out forwards' };
    const backdropAnimation = { animation: 'fadeIn 0.3s ease-out forwards' };

    return (
        <div 
            style={backdropAnimation}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <div 
                style={modalAnimation}
                className="relative w-full max-w-lg"
            >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl blur opacity-75"></div>
                <div className="relative bg-gray-900 rounded-2xl shadow-xl border border-gray-700/50">
                    <div className="p-6 border-b border-cyan-800/50 flex justify-between items-center">
                        <h3 className="text-2xl font-bold font-orbitron bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            {title}
                        </h3>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors duration-200"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Keyframes para las animaciones (puedes poner esto en tu index.css si lo prefieres)
const styles = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
`;

// Inyectar los estilos en el head del documento
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default Modal;
