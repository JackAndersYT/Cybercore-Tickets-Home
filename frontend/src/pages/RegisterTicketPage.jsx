import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ticketService from '../services/ticketService';
import { Plus, FileText, Users, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const RegisterTicketPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedToArea, setAssignedToArea] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Efecto para limpiar el mensaje de éxito después de 3 segundos
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const getAreaOptions = () => {
        if (!user) return [];
        if (user.Area === 'Contabilidad') {
            return ['Soporte'];
        }
        return ['Soporte', 'Contabilidad'];
    };

    const areaOptions = getAreaOptions();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await ticketService.create({ title, description, assignedtoarea: assignedToArea });
            setSuccess(response.msg);
            setTitle('');
            setDescription('');
            setAssignedToArea('');
        } catch (err) {
            setError(err.response?.data?.msg || 'Error al registrar el ticket.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/');
    };

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-cyan-400/30">
                                <FileText className="w-8 h-8 text-cyan-400" />
                            </div>
                            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron">
                                Registrar Nuevo Ticket
                            </h2>
                        </div>
                        <p className="text-gray-400 text-lg">Crea un nuevo ticket de soporte o solicitud</p>
                    </div>
                    
                    <button 
                        onClick={handleCancel}
                        className="group relative px-6 py-3 bg-gradient-to-r from-gray-700/50 to-gray-600/50 text-gray-300 rounded-2xl hover:text-white transition-all duration-300"
                    >
                        <div className="relative flex items-center space-x-2">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Volver al Dashboard</span>
                        </div>
                    </button>
                </div>

                {/* Mensajes de Estado */}
                {error && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-red-300 font-medium">{error}</p>
                        </div>
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-green-900/50 to-emerald-800/50 border border-green-500/50 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <p className="text-green-300 font-medium">{success}</p>
                        </div>
                    </div>
                )}

                {/* Formulario Principal */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-60"></div>
                    <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:border-cyan-400/30 transition-all duration-300">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Campo Título */}
                            <div className="space-y-3">
                                <label htmlFor="title" className="block text-sm font-semibold text-cyan-400">
                                    Título del Ticket
                                </label>
                                <input
                                    id="title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="Ingrese un título descriptivo..."
                                    className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300"
                                />
                            </div>

                            {/* Campo Descripción */}
                            <div className="space-y-3">
                                <label htmlFor="description" className="block text-sm font-semibold text-cyan-400">
                                    Descripción Detallada
                                </label>
                                <textarea
                                    id="description"
                                    rows="6"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    placeholder="Describe detalladamente el problema o solicitud..."
                                    className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 resize-none"
                                />
                            </div>

                            {/* Campo Área Asignada */}
                            <div className="space-y-3">
                                <label htmlFor="assignedToArea" className="block text-sm font-semibold text-cyan-400">
                                    Asignar a Área
                                </label>
                                <div className="relative">
                                    <select
                                        id="assignedToArea"
                                        value={assignedToArea}
                                        onChange={(e) => setAssignedToArea(e.target.value)}
                                        required
                                        className="w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 appearance-none"
                                    >
                                        <option value="" disabled className="bg-gray-800">
                                            Seleccione un área responsable...
                                        </option>
                                        {areaOptions.map(option => (
                                            <option key={option} value={option} className="bg-gray-800">
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex flex-col sm:flex-row items-center justify-end space-y-4 sm:space-y-0 sm:space-x-6 pt-8 border-t border-gray-700/50">
                                {/* Botón Cancelar */}
                                <button 
                                    type="button" 
                                    onClick={handleCancel}
                                    className="w-full sm:w-auto px-8 py-3 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 hover:text-white transition-all duration-300 font-medium"
                                >
                                    Cancelar
                                </button>

                                {/* Botón Registrar */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                    <div className="relative flex items-center justify-center space-x-2">
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Registrando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5" />
                                                <span>Registrar Ticket</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer informativo */}
                <div className="mt-6 p-4 bg-gray-800/50 rounded-2xl border border-gray-700/50">
                    <div className="flex items-center justify-center text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-cyan-400/50 rounded-full"></div>
                            <span>Una vez registrado, el ticket será asignado automáticamente al área seleccionada</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterTicketPage;
