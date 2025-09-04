import React, { useState, useEffect, useContext } from 'react';
import userService from '../services/userService';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import { User, UserPlus, Edit, Trash2, Shield, Users, Eye, EyeOff, ChevronDown, RotateCcw, ArrowLeft, ArrowRight, Search, Filter, Settings, Activity } from 'lucide-react';

// Inyectar los keyframes para la animación de las tarjetas
const animationStyles = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
}

@keyframes float-gentle {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
}

.animate-float-gentle {
    animation: float-gentle 3s ease-in-out infinite;
}
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = animationStyles;
document.head.appendChild(styleSheet);

const AdminUsersPage = () => {
    const { user: currentUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPasswords, setShowPasswords] = useState({ register: false, edit: false });
    
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');
    
    const [registerFormErrors, setRegisterFormErrors] = useState({});
    const [editFormErrors, setEditFormErrors] = useState({});

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const [editFormData, setEditFormData] = useState({ fullName: '', role: '', area: '', password: '', confirmPassword: '' });
    const [registerFormData, setRegisterFormData] = useState({ fullname: '', username: '', password: '', confirmPassword: '', role: 'Estándar', area: 'Personal Operativo' });
    
    const [filters, setFilters] = useState({ area: 'Todos', role: 'Todos' });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async (page) => {
        try {
            setLoading(true);
            const data = await userService.getAll(page);
            setUsers(data.users);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
        } catch (err) {
            setPageError('No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const clearMessages = () => {
        setPageError('');
        setPageSuccess('');
        setRegisterFormErrors({});
        setEditFormErrors({});
    };

    const handleEditClick = (user) => {
        clearMessages();
        setSelectedUser(user);
        setEditFormData({ fullName: user.FullName, role: user.Role, area: user.Area, password: '', confirmPassword: '' });
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (user) => {
        clearMessages();
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleRegisterClick = () => {
        clearMessages();
        setIsRegisterModalOpen(true);
    };
    
    const handleCloseRegisterModal = () => {
        setIsRegisterModalOpen(false);
        setRegisterFormData({ fullname: '', username: '', password: '', confirmPassword: '', role: 'Estándar', area: 'Personal Operativo' });
        setRegisterFormErrors({});
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const errors = {};
        if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
            errors.password = 'Las contraseñas no coinciden.';
            errors.confirmPassword = 'Las contraseñas no coinciden.';
        }
        if (Object.keys(errors).length > 0) {
            return setEditFormErrors(errors);
        }
        try {
            await userService.update(selectedUser.UserID, { fullName: editFormData.fullName, role: editFormData.role, area: editFormData.area });
            if (editFormData.password) {
                await userService.updatePassword(selectedUser.UserID, editFormData.password);
            }
            setPageSuccess('Usuario actualizado correctamente.');
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (err) {
            setEditFormErrors({ form: err.response?.data?.msg || 'Error al actualizar.' });
        }
    };

    const handleConfirmDelete = async () => {
        clearMessages();
        try {
            const res = await userService.remove(selectedUser.UserID);
            setPageSuccess(res.msg);
            setIsDeleteModalOpen(false);
            fetchUsers();
        } catch (err) {
            setPageError(err.response?.data?.msg || 'Error al eliminar.');
        }
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        const errors = {};
        if (registerFormData.password !== registerFormData.confirmPassword) {
            errors.password = 'Las contraseñas no coinciden.';
            errors.confirmPassword = 'Las contraseñas no coinciden.';
        }
        if (Object.keys(errors).length > 0) {
            return setRegisterFormErrors(errors);
        }
        try {
            const res = await userService.register(registerFormData);
            setPageSuccess(res.msg);
            handleCloseRegisterModal();
            fetchUsers();
        } catch (err) {
            const apiError = err.response?.data?.msg || 'Error al registrar el usuario.';
            if (apiError.toLowerCase().includes('usuario')) {
                setRegisterFormErrors({ username: apiError });
            } else {
                setRegisterFormErrors({ form: apiError });
            }
        }
    };
    
    const handleFormChange = (e, formSetter, errorSetter) => {
        const { name, value } = e.target;
        formSetter(prev => ({ ...prev, [name]: value }));
        errorSetter(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            if (name === 'password' || name === 'confirmPassword') {
                delete newErrors.password;
                delete newErrors.confirmPassword;
            }
            return newErrors;
        });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ area: 'Todos', role: 'Todos' });
        setSearchTerm('');
    };

    const getRoleColor = (role) => {
        return role === 'Administrador' ? 'from-purple-500 to-pink-500' : 'from-cyan-500 to-blue-500';
    };

    const getAreaIcon = (area) => {
        switch (area) {
            case 'Soporte': return '🛠️';
            case 'Contabilidad': return '💰';
            case 'Personal Operativo': return '👥';
            default: return '📋';
        }
    };

    const filteredUsers = users.filter(user => {
        const areaMatch = filters.area === 'Todos' || user.Area === filters.area;
        const roleMatch = filters.role === 'Todos' || user.Role === filters.role;
        const searchMatch = searchTerm === '' || 
                            user.FullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.Username.toLowerCase().includes(searchTerm.toLowerCase());
        return areaMatch && roleMatch && searchMatch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center space-y-6">
                    {/* Loader mejorado igual al del dashboard */}
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 border-4 border-slate-700/30 rounded-full"></div>
                        <div className="absolute inset-2 border-4 border-r-cyan-400 border-t-indigo-400 border-l-transparent border-b-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                            <Users className="w-8 h-8 text-slate-900 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                            Cargando Usuarios
                        </div>
                        <div className="text-sm text-slate-400 tracking-wide">
                            Obteniendo datos del sistema...
                        </div>
                    </div>
                    
                    <div className="flex justify-center space-x-1">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full animate-bounce"
                                style={{animationDelay: `${i * 0.15}s`}}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header del Dashboard rediseñado con el estilo del DashboardPage */}
            <div className="relative">
    {/* Layout Desktop */}
    <div className="hidden sm:flex items-center space-x-6 mb-6">
        <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-cyan-400/40">
                <Users className="w-8 h-8 text-cyan-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900">
                    <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                </div>
            </div>
        </div>
        
        <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Administrar Usuarios
            </h1>
            <div className="flex items-center space-x-3 mt-2">
                <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-sm text-slate-400 uppercase tracking-wider">Sistema Activo</span>
                </div>
                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                    {filteredUsers.length} Usuario{filteredUsers.length !== 1 ? 's' : ''}
                </span>
            </div>
        </div>

        <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <button 
                onClick={handleRegisterClick}
                className="relative flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 border border-emerald-400/20 hover:border-emerald-400/40"
            >
                <UserPlus className="w-5 h-5" />
                <span>Nuevo Usuario</span>
            </button>
        </div>
    </div>

    {/* Layout Mobile */}
    <div className="sm:hidden space-y-4 mb-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-xl blur-lg opacity-60 animate-pulse"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl border border-cyan-400/40">
                        <Users className="w-6 h-6 text-cyan-400" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900">
                            <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Administrar Usuarios
                    </h1>
                    <div className="flex items-center space-x-2 mt-1">
                        <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Sistema Activo</span>
                    </div>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <button 
                    onClick={handleRegisterClick}
                    className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 border border-emerald-400/20 hover:border-emerald-400/40"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="text-center">
            <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                {filteredUsers.length} Usuario{filteredUsers.length !== 1 ? 's' : ''}
            </span>
        </div>
    </div>

    {/* Línea divisoria con efecto */}
    <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
</div>

            {/* Panel de filtros rediseñado con el estilo glassmorphism */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 to-cyan-400/5 rounded-3xl"></div>
                <div className="absolute inset-0 border border-slate-600/30 rounded-3xl group-hover:border-purple-400/40 transition-colors duration-500"></div>
                
                <div className="relative p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-500 rounded-xl blur-md opacity-50"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-purple-400/30">
                                    <Filter className="w-6 h-6 text-purple-400" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Filtros de Búsqueda</h3>
                                <p className="text-sm text-slate-400">Encuentra usuarios específicos</p>
                            </div>
                        </div>
                        
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
                        {/* Campo de búsqueda */}
                        <div className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl blur-sm"></div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 z-10" />
                                <input 
                                    type="text"
                                    placeholder="Buscar por nombre o usuario..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800/70 backdrop-blur-sm border border-cyan-400/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/60 focus:bg-slate-800/90 transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Selector de área */}
                        <div className="relative w-full lg:w-52">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl blur-sm"></div>
                            <select 
                                name="area" 
                                value={filters.area} 
                                onChange={handleFilterChange} 
                                className="relative w-full px-4 py-3 bg-slate-800/70 backdrop-blur-sm border border-emerald-400/30 rounded-xl text-white appearance-none focus:outline-none focus:border-emerald-400/60 cursor-pointer transition-all duration-300"
                            >
                                <option value="Todos" className="bg-slate-800">Todas las Áreas</option>
                                <option value="Soporte" className="bg-slate-800">Soporte</option>
                                <option value="Contabilidad" className="bg-slate-800">Contabilidad</option>
                                <option value="Personal Operativo" className="bg-slate-800">Personal Operativo</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                        </div>

                        {/* Selector de rol */}
                        <div className="relative w-full lg:w-52">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl blur-sm"></div>
                            <select 
                                name="role" 
                                value={filters.role} 
                                onChange={handleFilterChange} 
                                className="relative w-full px-4 py-3 bg-slate-800/70 backdrop-blur-sm border border-yellow-400/30 rounded-xl text-white appearance-none focus:outline-none focus:border-yellow-400/60 cursor-pointer transition-all duration-300"
                            >
                                <option value="Todos" className="bg-slate-800">Todos los Roles</option>
                                <option value="Administrador" className="bg-slate-800">Administrador</option>
                                <option value="Estándar" className="bg-slate-800">Estándar</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 pointer-events-none" />
                        </div>

                        {/* Botón limpiar */}
                        <div className="w-full lg:w-auto">
                            <button 
                                onClick={handleClearFilters}
                                className="group relative w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-slate-300 rounded-xl hover:text-white transition-all duration-300 transform hover:scale-105"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-600/50 to-slate-500/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                <div className="relative flex items-center justify-center space-x-2">
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Limpiar</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mensajes de estado mejorados */}
            {pageError && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-800/40 to-red-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-red-500/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-red-500/30 rounded-3xl"></div>
                    
                    <div className="relative p-6 flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        </div>
                        <div>
                            <h4 className="text-red-300 font-semibold">Error</h4>
                            <p className="text-red-200 text-sm">{pageError}</p>
                        </div>
                    </div>
                </div>
            )}
            
            {pageSuccess && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/40 to-emerald-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-emerald-500/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-emerald-500/30 rounded-3xl"></div>
                    
                    <div className="relative p-6 flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        </div>
                        <div>
                            <h4 className="text-emerald-300 font-semibold">Éxito</h4>
                            <p className="text-emerald-200 text-sm">{pageSuccess}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Contenido principal rediseñado */}
            {filteredUsers.length === 0 && !loading ? (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-400/5 to-slate-500/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    
                    <div className="relative p-12 text-center">
                        <div className="relative mx-auto w-20 h-20 mb-6">
                            <div className="absolute inset-0 bg-slate-600/20 rounded-full blur-lg"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-slate-600/50">
                                <Users className="w-10 h-10 text-slate-400" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-semibold text-slate-300 mb-2">No hay usuarios disponibles</h3>
                        <p className="text-slate-500 mb-6">No hay usuarios que coincidan con los filtros seleccionados</p>
                        
                        <div className="flex justify-center space-x-2">
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 bg-slate-500/60 rounded-full animate-pulse"
                                    style={{animationDelay: `${i * 0.3}s`}}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-2xl"></div>
                    <div className="relative p-6 rounded-2xl border border-slate-600/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredUsers.map((user, index) => (
                                <div 
                                    key={user.UserID} 
                                    className="group relative transform transition-all duration-500 hover:scale-[1.02]"
                                    style={{
                                        animationDelay: `${index * 100}ms`
                                    }}
                                >
                                    <div className="animate-fade-in-up">
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:border-cyan-400/50 transition-all duration-300 h-full flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
    <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-slate-300" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full border-2 border-slate-800"></div>
        </div>
        <div className="min-w-0">
            <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors duration-300 leading-tight break-words sm:truncate">
                {user.FullName}
            </h3>
            <p className="text-sm text-slate-400 truncate">@{user.Username}</p>
        </div>
    </div>
    <div className={`hidden sm:flex px-3 py-1.5 bg-gradient-to-r ${getRoleColor(user.Role)} rounded-full text-white text-xs font-bold items-center space-x-1 shadow-lg flex-shrink-0`}>
        <Shield className="w-3 h-3" />
        <span>{user.Role}</span>
    </div>
</div>

{/* Etiqueta de rol solo en móvil */}
<div className="sm:hidden flex items-center space-x-2 p-3 bg-slate-800/50 rounded-2xl mb-4">
    <Shield className="w-4 h-4 text-purple-400" />
    <span className="text-slate-300 font-medium">{user.Role}</span>
</div>

<div className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-2xl mb-4">
    <span className="text-lg">{getAreaIcon(user.Area)}</span>
    <span className="text-slate-300 font-medium">{user.Area}</span>
</div>
                                            </div>
                                            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700/50">
                                                <button 
                                                    onClick={() => handleEditClick(user)} 
                                                    className="group/btn relative px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-300 flex items-center space-x-2 hover:shadow-lg hover:shadow-cyan-500/25"
                                                >
                                                    <Edit className="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-300" />
                                                    <span className="font-medium">Editar</span>
                                                </button>
                                                {currentUser.Role === 'Administrador' && currentUser.UserID !== user.UserID && (
                                                    <button 
                                                        onClick={() => handleDeleteClick(user)} 
                                                        className="group/btn relative px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 rounded-xl hover:from-red-500/30 hover:to-pink-500/30 transition-all duration-300 flex items-center space-x-2 hover:shadow-lg hover:shadow-red-500/25"
                                                    >
                                                        <Trash2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform duration-300" />
                                                        <span className="font-medium">Eliminar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Paginación rediseñada con estilo del dashboard */}
            {totalPages > 1 && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-purple-400/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl group-hover:border-cyan-400/40 transition-colors duration-500"></div>
                    
                    <div className="relative p-8">
                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="group relative p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                <ArrowLeft className="relative w-5 h-5" />
                            </button>

                            <div className="flex items-center space-x-4">
                                <div className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-400/30">
                                    <span className="font-bold text-lg text-purple-300">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                </div>
                                
                                {/* Indicador visual de páginas */}
                                <div className="hidden sm:flex items-center space-x-2">
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const page = i + 1;
                                        const isActive = page === currentPage;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                                    isActive 
                                                        ? 'bg-gradient-to-r from-cyan-400 to-purple-400 scale-125' 
                                                        : 'bg-slate-600/50 hover:bg-slate-500/70'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="group relative p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 rounded-xl hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                <ArrowRight className="relative w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de registro con estilo mejorado */}
            <Modal isOpen={isRegisterModalOpen} onClose={handleCloseRegisterModal} title="Registrar Nuevo Usuario">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 to-cyan-400/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    
                    <div className="relative p-6">
                        <form onSubmit={handleRegisterUser} className="space-y-5">
                            {registerFormErrors.form && (
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-2xl"></div>
                                    <div className="absolute inset-0 border border-red-500/50 rounded-2xl"></div>
                                    <div className="relative p-4 flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                        <p className="text-red-300 text-sm font-medium">{registerFormErrors.form}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    name="fullname" 
                                    value={registerFormData.fullname} 
                                    onChange={(e) => handleFormChange(e, setRegisterFormData, setRegisterFormErrors)} 
                                    required 
                                    className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300" 
                                    placeholder="Ingresa el nombre completo" 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Nombre de Usuario</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={registerFormData.username} 
                                    onChange={(e) => handleFormChange(e, setRegisterFormData, setRegisterFormErrors)} 
                                    required 
                                    className={`w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border rounded-xl text-white placeholder-slate-400 transition-all duration-300 ${registerFormErrors.username ? 'border-red-500/60 focus:ring-red-500/20' : 'border-slate-600/50 focus:border-cyan-400/60 focus:ring-cyan-400/20'}`} 
                                    placeholder="Ingresa el nombre de usuario" 
                                />
                                {registerFormErrors.username && <p className="text-xs text-red-400 mt-1">{registerFormErrors.username}</p>}
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Contraseña</label>
                                <div className="relative">
                                    <input 
                                        type={showPasswords.register ? "text" : "password"} 
                                        name="password" 
                                        value={registerFormData.password} 
                                        onChange={(e) => handleFormChange(e, setRegisterFormData, setRegisterFormErrors)} 
                                        required 
                                        className={`w-full px-4 py-3 pr-12 bg-slate-800/50 backdrop-blur-sm border rounded-xl text-white placeholder-slate-400 transition-all duration-300 ${registerFormErrors.password ? 'border-red-500/60 focus:ring-red-500/20' : 'border-slate-600/50 focus:border-cyan-400/60 focus:ring-cyan-400/20'}`} 
                                        placeholder="Ingresa la contraseña" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPasswords(prev => ({...prev, register: !prev.register}))} 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                                    >
                                        {showPasswords.register ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {registerFormErrors.password && <p className="text-xs text-red-400 mt-1">{registerFormErrors.password}</p>}
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Confirmar Contraseña</label>
                                <div className="relative">
                                    <input 
                                        type={showPasswords.register ? "text" : "password"} 
                                        name="confirmPassword" 
                                        value={registerFormData.confirmPassword} 
                                        onChange={(e) => handleFormChange(e, setRegisterFormData, setRegisterFormErrors)} 
                                        required 
                                        className={`w-full px-4 py-3 pr-12 bg-slate-800/50 backdrop-blur-sm border rounded-xl text-white placeholder-slate-400 transition-all duration-300 ${registerFormErrors.confirmPassword ? 'border-red-500/60 focus:ring-red-500/20' : 'border-slate-600/50 focus:border-cyan-400/60 focus:ring-cyan-400/20'}`} 
                                        placeholder="Confirma la contraseña" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-cyan-400">Rol</label>
                                    <div className="relative">
                                        <select 
                                            name="role" 
                                            value={registerFormData.role} 
                                            onChange={(e) => handleFormChange(e, setRegisterFormData, setRegisterFormErrors)} 
                                            className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 appearance-none"
                                        >
                                            <option value="Estándar">Estándar</option>
                                            <option value="Administrador">Administrador</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-cyan-400">Área</label>
                                    <div className="relative">
                                        <select 
                                            name="area" 
                                            value={registerFormData.area} 
                                            onChange={(e) => handleFormChange(e, setRegisterFormData, setRegisterFormErrors)} 
                                            className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 appearance-none"
                                        >
                                            <option value="Personal Operativo">Personal Operativo</option>
                                            <option value="Soporte">Soporte</option>
                                            <option value="Contabilidad">Contabilidad</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-6">
                                <button 
                                    type="submit" 
                                    className="group relative px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                    <span className="relative">Registrar Usuario</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            {/* Modal de edición con estilo mejorado */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Usuario">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-indigo-400/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    
                    <div className="relative p-6">
                        <form onSubmit={handleUpdateUser} className="space-y-5">
                            {editFormErrors.form && (
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-2xl"></div>
                                    <div className="absolute inset-0 border border-red-500/50 rounded-2xl"></div>
                                    <div className="relative p-4 flex items-center space-x-3">
                                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                        <p className="text-red-300 text-sm font-medium">{editFormErrors.form}</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    name="fullName" 
                                    value={editFormData.fullName} 
                                    onChange={(e) => handleFormChange(e, setEditFormData, setEditFormErrors)} 
                                    className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300" 
                                    placeholder="Ingresa el nombre completo" 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Nueva Contraseña (Opcional)</label>
                                <div className="relative">
                                    <input 
                                        type={showPasswords.edit ? "text" : "password"} 
                                        name="password" 
                                        value={editFormData.password} 
                                        onChange={(e) => handleFormChange(e, setEditFormData, setEditFormErrors)} 
                                        className={`w-full px-4 py-3 pr-12 bg-slate-800/50 backdrop-blur-sm border rounded-xl text-white placeholder-slate-400 transition-all duration-300 ${editFormErrors.password ? 'border-red-500/60 focus:ring-red-500/20' : 'border-slate-600/50 focus:border-cyan-400/60 focus:ring-cyan-400/20'}`} 
                                        placeholder="Nueva contraseña (opcional)" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPasswords(prev => ({...prev, edit: !prev.edit}))} 
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
                                    >
                                        {showPasswords.edit ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {editFormErrors.password && <p className="text-xs text-red-400 mt-1">{editFormErrors.password}</p>}
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-cyan-400">Confirmar Contraseña</label>
                                <div className="relative">
                                    <input 
                                        type={showPasswords.edit ? "text" : "password"} 
                                        name="confirmPassword" 
                                        value={editFormData.confirmPassword} 
                                        onChange={(e) => handleFormChange(e, setEditFormData, setEditFormErrors)} 
                                        className={`w-full px-4 py-3 pr-12 bg-slate-800/50 backdrop-blur-sm border rounded-xl text-white placeholder-slate-400 transition-all duration-300 ${editFormErrors.confirmPassword ? 'border-red-500/60 focus:ring-red-500/20' : 'border-slate-600/50 focus:border-cyan-400/60 focus:ring-cyan-400/20'}`} 
                                        placeholder="Confirma la nueva contraseña" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-cyan-400">Rol</label>
                                    <div className="relative">
                                        <select 
                                            name="role" 
                                            value={editFormData.role} 
                                            onChange={(e) => handleFormChange(e, setEditFormData, setEditFormErrors)} 
                                            className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 appearance-none"
                                        >
                                            <option value="Estándar">Estándar</option>
                                            <option value="Administrador">Administrador</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-cyan-400">Área</label>
                                    <div className="relative">
                                        <select 
                                            name="area" 
                                            value={editFormData.area} 
                                            onChange={(e) => handleFormChange(e, setEditFormData, setEditFormErrors)} 
                                            className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 appearance-none"
                                        >
                                            <option value="Soporte">Soporte</option>
                                            <option value="Contabilidad">Contabilidad</option>
                                            <option value="Personal Operativo">Personal Operativo</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-6">
                                <button 
                                    type="submit" 
                                    className="group relative px-8 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                    <span className="relative">Guardar Cambios</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            {/* Modal de eliminación con estilo mejorado */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl backdrop-blur-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-red-500/5 rounded-3xl"></div>
                    <div className="absolute inset-0 border border-slate-600/30 rounded-3xl"></div>
                    
                    <div className="relative p-6">
                        <div className="text-center space-y-6">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-lg"></div>
                                <div className="relative w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center border border-red-500/50">
                                    <Trash2 className="w-8 h-8 text-red-400" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-slate-300 text-lg">
                                    ¿Estás seguro de que deseas eliminar al usuario
                                </p>
                                <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                                    {selectedUser?.FullName}
                                </p>
                                <p className="text-red-400 font-medium">
                                    Esta acción no se puede deshacer.
                                </p>
                            </div>
                            
                            <div className="flex justify-center space-x-4 pt-4">
                                <button 
                                    onClick={() => setIsDeleteModalOpen(false)} 
                                    className="relative px-6 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-slate-300 rounded-xl hover:from-slate-600/60 hover:to-slate-500/60 hover:text-white transition-all duration-300 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmDelete} 
                                    className="group relative px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                                    <span className="relative">Eliminar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminUsersPage;