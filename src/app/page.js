"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [1] UTILIDADES Y CONFIGURACIÓN DE FORMATO (HELPERS)
  // ============================================================

  // --- OBTENER FECHA EXACTA DE CHICLAYO (GMT-5) ---
  // Evita que las ventas nocturnas salgan con fecha del día siguiente.
  const getFechaPeru = (dateInput = new Date()) => {
    try {
        const opciones = { 
            timeZone: "America/Lima", 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(new Date(dateInput));
        const anio = partes.find(p => p.type === 'year').value;
        const mes = partes.find(p => p.type === 'month').value;
        const dia = partes.find(p => p.type === 'day').value;
        return `${anio}-${mes}-${dia}`;
    } catch (error) {
        console.error("Error en formato fecha:", error);
        return new Date().toISOString().split('T')[0];
    }
  };

  // --- LIMPIEZA DE DECIMALES (COMAS A PUNTOS) ---
  // Permite que el usuario escriba 15,50 y el sistema guarde 15.50 correctamente.
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return String(valor || '');
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // --- LÓGICA DE ANTIGÜEDAD (ETIQUETAS DINÁMICAS) ---
  const getEtiquetaProducto = (createdAt) => {
    if (!createdAt) return null;
    const fechaCreacion = new Date(createdAt);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));
    
    if (diferenciaDias <= 3) {
        return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
    } else if (diferenciaDias > 3 && diferenciaDias <= 8) {
        return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
    }
    return null;
  };

  // ============================================================
  // [2] DEFINICIÓN DE ESTADOS (STATE MANAGEMENT)
  // ============================================================

  // --- VISTAS Y DATOS ---
  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- BUSCADORES ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- FORMULARIO DE VENTA ACTUAL ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- EDICIÓN EN HISTORIAL (CLIENTES) ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  
  // --- EDICIÓN EN GESTIÓN (FINANZAS) ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  
  // --- FORMULARIOS DE GESTIÓN PRODUCTOS ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ============================================================
  // [3] CONEXIÓN CON SUPABASE Y TIEMPO REAL
  // ============================================================

  useEffect(() => {
    cargarTodo();

    const canalVentas = supabase.channel('bj-ventas-v28')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .subscribe();

    const canalProductos = supabase.channel('bj-prod-v28')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .subscribe();

    const canalFinanzas = supabase.channel('bj-fin-v28')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalFinanzas);
    };
  }, []);

  const cargarTodo = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        
        if (p) {
            setProductos(p);
            const cants = {}; const cols = {};
            p.forEach(prod => { 
                cants[prod.id] = 1; 
                cols[prod.id] = prod.colores?.split(',')[0].trim() || 'N/A'; 
            });
            setCantidades(prev => ({ ...cants, ...prev }));
            setColoresElegidos(prev => ({ ...cols, ...prev }));
        }
        if (v) setVentas(v);
        if (f) setFinanzas(f);
    } catch (err) {
        console.error("Error cargando base de datos:", err);
    }
  };

  // ============================================================
  // [4] LÓGICA DE NEGOCIO Y CÁLCULOS (MEMOS)
  // ============================================================

  // --- LOGÍSTICA: TODO LO "EN ALMACÉN" DE CUALQUIER FECHA ---
  const pendientesAlmacen = useMemo(() => {
    const enAlmacen = (ventas || []).filter(v => v.estado_pedido === 'En Almacén');
    const grupos = {};
    enAlmacen.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) {
        grupos[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], totalVenta: 0 };
      }
      grupos[key].items.push(v);
      grupos[key].totalVenta += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
    });
    return Object.values(grupos);
  }, [ventas]);

  // --- VENTAS: AGRUPACIÓN POR CLIENTE EN EL HISTORIAL DEL DÍA ---
  const historialVentasHoy = useMemo(() => {
    const filtradas = (ventas || []).filter(v => getFechaPeru(v.created_at) === fechaConsulta);
    const grupos = {};
    filtradas.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}-${v.created_at?.substring(0,16)}`; 
      if (!grupos[key]) {
        grupos[key] = { id_grupo: key, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, total: 0, items: [] };
      }
      grupos[key].items.push(v);
      grupos[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
    });
    return Object.values(grupos).reverse();
  }, [ventas, fechaConsulta]);

  // --- TOTALES DE CAJA DEL DÍA ---
  const cajaDelDia = useMemo(() => {
    const hoy = getFechaPeru();
    const vHoy = (ventas || []).filter(v => getFechaPeru(v.created_at) === hoy);
    return { 
      totalCaja: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0),
      totalGanancia: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0)
    };
  }, [ventas]);

  // --- BALANCE CONTABLE ---
  const balanceContable = useMemo(() => {
    const egresos = (finanzas || []).filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const extras = (finanzas || []).filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const ventasBrutas = (ventas || []).reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
    const gananciaNetaReal = (ventas || []).reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    return { 
        egresos, 
        ingresosExtras: extras, 
        gananciaNetaReal, 
        efectivoEnCaja: (ventasBrutas + extras - egresos) 
    };
  }, [finanzas, ventas]);

  // --- VALORIZACIÓN DE STOCK (INVERSIÓN) ---
  const valorizacionInventario = useMemo(() => {
    let sumCosto = 0; let sumVenta = 0; let sumUnidades = 0;
    (productos || []).forEach(p => { 
      if (Number(p.stock || 0) > 0) { 
        sumCosto += (Number(p.precio_compra || 0) * Number(p.stock || 0)); 
        sumVenta += (Number(p.precio_venta || 0) * Number(p.stock || 0)); 
        sumUnidades += Number(p.stock || 0); 
      } 
    });
    return { sumCosto, sumVenta, sumUnidades, sumUtilidad: sumVenta - sumCosto };
  }, [productos]);

  const chartData = [
    { name: 'Lo Invertido', value: valorizacionInventario.sumCosto, fill: '#1E1B1C' },
    { name: 'Lo que Recibo', value: valorizacionInventario.sumVenta, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [5] MANEJADORES DE ACCIÓN (HANDLERS)
  // ============================================================

  const handleClienteChange = (e) => {
    const val = e.target.value; setCliente(val);
    const coincidencia = ventas.find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (coincidencia) { 
        setLocalidad(coincidencia.localidad || ''); 
        setTelefono(coincidencia.telefono || ''); 
    }
  };

  const addCarrito = (p) => {
    const c = Number(cantidades[p.id] || 1);
    const pBase = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const yaEnCarrito = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    
    if (Number(p.stock || 0) < c + yaEnCarrito) return alert(`¡ERROR! No hay stock suficiente de ${p.nombre}.`);
    
    setCarrito([...carrito, { 
      producto_id: p.id, 
      nombre: p.nombre, 
      cantidad: c, 
      color: coloresElegidos[p.id], 
      precio_venta: pBase, 
      precio_compra: p.precio_compra 
    }]);
  };

  const enviarWhatsAppTicket = (grupo) => {
    let mensajeStr = `¡Hola *${grupo.cliente_nombre}*! 👋 Aquí tienes el resumen de tu pedido en *B J Importaciones Chiclayo*.%0A%0A`;
    grupo.items.forEach(v => {
        const nom = productos.find(p => p.id === v.producto_id)?.nombre || "Producto";
        mensajeStr += `- *${v.cantidad}x* ${nom} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    mensajeStr += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias por tu compra! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${mensajeStr}`, '_blank');
  };

  const ejecutarVenta = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Por favor completa el nombre y la zona del cliente.");
    if (carrito.length === 0) return alert("El carrito está vacío.");

    const totalBruto = carrito.reduce((acc, i) => acc + (Number(i.precio_venta || 0) * i.cantidad), 0);
    const ratioD = totalBruto > 0 ? (Number(descuento) / totalBruto) : 0;

    const inserts = carrito.map(i => {
      const pUnit = Number(i.precio_venta || 0);
      const sub = pUnit * i.cantidad;
      const gan = ((pUnit - Number(i.precio_compra || 0)) * i.cantidad) - (sub * ratioD);
      return { 
        cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: pUnit, 
        precio_costo_unitario: Number(i.precio_compra || 0), 
        ganancia_total: gan, 
        estado_pedido: estado 
      };
    });

    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const item of carrito) {
        const prodMatch = productos.find(p => p.id === item.producto_id);
        await supabase.from('productos').update({ stock: prodMatch.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta procesada.");
    }
  };

  const prepararEditHistorial = (grupo) => {
    setEditandoGrupoId(grupo.id_grupo);
    setFormEditCliente({ nombre: grupo.cliente_nombre, localidad: grupo.localidad, telefono: grupo.telefono });
  };

  const guardarEditHistorial = async (grupo) => {
    for (const item of grupo.items) {
      await supabase.from('ventas').update({
        cliente_nombre: formEditCliente.nombre,
        localidad: formEditCliente.localidad,
        telefono: formEditCliente.telefono
      }).eq('id', item.id);
    }
    setEditandoGrupoId(null);
    alert("✅ Datos del cliente actualizados.");
  };

  const anularItemUnico = async (v) => {
    if (confirm("¿Seguro que quieres anular este ítem? El stock se devolverá al catálogo.")) {
      const prodEnCat = productos.find(pr => pr.id === v.producto_id);
      if (prodEnCat) await supabase.from('productos').update({ stock: prodEnCat.stock + v.cantidad }).eq('id', prodEnCat.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  const registrarGastoManual = async (e) => {
    e.preventDefault();
    const montoClean = handleInputMonto(formFinanzas.monto);
    const { error } = await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(montoClean)}]);
    if(!error) { setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''}); alert("Movimiento registrado."); }
  };

  const addNuevoProducto = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre,
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)),
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock),
        colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Producto agregado."); }
  };

  const actualizarStock = async (p) => {
    const val = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: val }).eq('id', p.id);
    alert("✅ Stock sincronizado.");
  };

  const borrarProductoTotal = async (p) => {
    if (confirm(`¿ELIMINAR DEFINITIVAMENTE ${p.nombre}? Esto borrará todo su registro.`)) {
      await supabase.from('productos').delete().eq('id', p.id);
    }
  };

  const updateGastoDiario = async () => {
    const valLimpio = handleInputMonto(String(formEditFinanza.monto));
    await supabase.from('finanzas').update({ 
        tipo: formEditFinanza.tipo, 
        descripcion: formEditFinanza.descripcion, 
        monto: Number(valLimpio) 
    }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null);
    alert("✅ Gasto actualizado.");
  };

  const exportarExcelCaja = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Localidad,Producto,Cantidad,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nP = productos.find(p=>p.id===v.producto_id)?.nombre || "N/A";
      csv += `${getFechaPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Cierre_BJ_Import_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ============================================================
  // [6] DEFINICIÓN DE INTERFAZ Y ESTILOS (RENDER)
  // ============================================================

  const s_input = { padding: '15px', borderRadius: '15px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.2s' };
  const s_card = { backgroundColor: '#ffffff', borderRadius: '30px', padding: '30px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR GLOBAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 20px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.5rem', boxShadow: `0 5px 15px ${FUCSIA_PRINCIPAL}40` }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, letterSpacing: '-0.8px' }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase', letterSpacing:'1px' }}>Dashboard Chiclayo v28</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '8px', borderRadius: '20px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '13px', transition: '0.3s' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '13px', transition: '0.3s' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '13px', transition: '0.3s' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '35px 20px' }}>
        
        {/* =================================================================================================== */}
        {/* [TAB 1] MÓDULO DE VENTAS Y CAJA                                                                    */}
        {/* =================================================================================================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* INDICADORES DE DINERO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={estiloCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>💰 DINERO CAJA HOY</span>
                  <button onClick={exportarExcelCaja} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '8px 20px', borderRadius: '12px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>CIERRE DE CAJA</button>
                </div>
                <h2 style={{ margin: '20px 0', fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-1.5px' }}>S/ {cajaDelDia.totalCaja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '16px', backgroundColor: '#F0FDF4', padding: '10px 20px', borderRadius: '15px', display: 'inline-block' }}>Ganancia Est.: S/ {cajaDelDia.totalGanancia.toFixed(2)}</div>
              </div>
              <div style={estiloCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>📅 BUSCAR HISTORIAL</span>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '8px 0', fontWeight: '600' }}>Selecciona un día para ver qué vendiste:</p>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...s_input, marginTop: '10px' }} />
              </div>
            </div>

            {/* PANEL DE NUEVA VENTA */}
            <div style={{ ...estiloCard, border: `3px solid #FCA5D4`, backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.6rem', fontWeight: '900' }}>🛒 Registrar Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '12px 25px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B', transition: '0.3s' }}>PRECIO MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '12px 25px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B', transition: '0.3s' }}>PRECIO MENOR</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                <div style={{ position:'relative' }}>
                    <label style={{fontSize:'11px', fontWeight:'900', color:FUCSIA_PRINCIPAL, marginLeft:'10px'}}>CLIENTE:</label>
                    <input list="data_clientes" placeholder="Ej: Juan Pérez" value={cliente} onChange={handleClienteChange} style={{...s_input, marginTop:'5px'}} />
                    <datalist id="data_clientes">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                </div>
                <div>
                    <label style={{fontSize:'11px', fontWeight:'900', color:FUCSIA_PRINCIPAL, marginLeft:'10px'}}>WHATSAPP:</label>
                    <input placeholder="Ej: 987654321" value={telefono} onChange={e => setTelefono(e.target.value)} style={{...s_input, marginTop:'5px'}} />
                </div>
                <div>
                    <label style={{fontSize:'11px', fontWeight:'900', color:FUCSIA_PRINCIPAL, marginLeft:'10px'}}>ZONA / PUEBLO / DISTRITO:</label>
                    <input placeholder="Ej: Chiclayo Centro" value={localidad} onChange={e => setLocalidad(e.target.value)} style={{...s_input, marginTop:'5px'}} />
                </div>
              </div>

              {/* CARRITO DE COMPRAS */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '30px', padding: '35px', marginBottom: '40px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px', color: FUCSIA_PRINCIPAL, fontSize: '16px', fontWeight: '900', letterSpacing: '1px' }}>LISTA DE PRODUCTOS SELECCIONADOS:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {carrito.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FCC2E2', paddingBottom: '18px', marginBottom: '5px' }}>
                        <div style={{ flex: 1 }}>
                            <strong style={{ color: '#1E1B1C', fontSize: '18px' }}>{item.cantidad}x</strong> <span style={{fontSize:'16px', fontWeight:'500'}}>{item.nombre}</span>
                            <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', backgroundColor: '#fff', padding: '2px 8px', borderRadius: '5px', marginTop: '5px', display: 'inline-block', border: '1px solid #FCC2E2' }}>Variante: {item.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 18px', borderRadius: '15px', border: '2px solid #FCA5D4' }}>
                             <span style={{ fontSize: '14px', fontWeight: '900', color: '#94A3B8' }}>S/</span>
                             <input 
                                type="text" 
                                value={item.precio_venta} 
                                onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} 
                                style={{ width: '85px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#1E1B1C' }} 
                             />
                          </div>
                          <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer', fontWeight: '900', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(247, 134, 193, 0.4)' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '35px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#64748B' }}>DESCUENTO S/</span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '14px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize: '20px' }} />
                    </div>
                    <h3 style={{ margin: '15px 0', fontSize: '2.8rem', color: '#1E1B1C', fontWeight: '900', letterSpacing: '-1px' }}>TOTAL FINAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '25px' }}>
                    <button onClick={() => ejecutarVenta('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px', boxShadow: '0 15px 30px rgba(0,0,0,0.2)', transition: '0.3s' }}>✅ COMPLETAR Y ENTREGAR</button>
                    <button onClick={() => ejecutarVenta('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px', boxShadow: `0 15px 30px ${FUCSIA_PRINCIPAL}50`, transition: '0.3s' }}>📦 PAGADO - EN ALMACÉN</button>
                  </div>
                </div>
              )}

              {/* CATÁLOGO DE PRODUCTOS */}
              <div style={{ marginBottom: '30px', position: 'relative' }}>
                <input placeholder="🔍 Buscar por nombre, marca o modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...s_input, paddingLeft: '65px', height: '70px', fontSize: '19px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }} />
                <span style={{ position: 'absolute', left: '25px', top: '20px', fontSize: '1.8rem', opacity: 0.5 }}>🔍</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '700px', overflowY: 'auto', padding: '10px' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const stCritico = p.stock < 5;

                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '25px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', transition: '0.3s' }}>
                      {tag && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tag.color, color: '#fff', fontSize: '11px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10, boxShadow: '0 5px 12px rgba(0,0,0,0.1)' }}>{tag.tipo} {tag.icono}</span>}
                      
                      <strong style={{ display: 'block', height: '48px', overflow: 'hidden', fontSize: '17px', lineHeight: '1.3', color: '#1E1B1C', marginBottom: '15px' }}>{p.nombre}</strong>
                      
                      <div style={{ margin: '15px 0', padding: '12px', backgroundColor: stCritico ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center', border: stCritico ? '1px solid #FECDD3' : '1px solid #BBF7D0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: stCritico ? '#E11D48' : '#16A34A', letterSpacing: '0.5px' }}>STOCK: {p.stock}</span>
                      </div>

                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...s_input, padding: '10px', fontSize: '14px', marginBottom: '20px', border: '1px solid #E2E8F0', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '22px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: '2px solid #E2E8F0', background: '#fff', borderRadius: '18px', width: '50px', height: '50px', cursor: 'pointer', fontWeight: '900', fontSize: '24px', transition: '0.2s' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '24px', minWidth: '30px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: '2px solid #E2E8F0', background: '#fff', borderRadius: '18px', width: '50px', height: '50px', cursor: 'pointer', fontWeight: '900', fontSize: '24px', transition: '0.2s' }}>+</button>
                      </div>

                      <button onClick={() => addCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontSize: '15px', fontWeight: '900', cursor:'pointer', transition: '0.3s', boxShadow: '0 8px 15px rgba(0,0,0,0.1)' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(pAMostrar).toFixed(2)}` : 'SANGRE AGOTADA'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL CON EDICIÓN DE CLIENTE */}
            <div style={estiloCard}>
              <h4 style={{ margin: 0, marginBottom: '35px', color: '#64748B', fontSize: '15px', letterSpacing: '2px', fontWeight: '900', textTransform: 'uppercase' }}>📜 Ventas Realizadas (Filtro por fecha)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.length === 0 ? <p style={{textAlign:'center', opacity:0.5, padding: '50px', fontWeight:'bold'}}>No se encontraron ventas para este día.</p> : historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `1px solid #FCC2E2`, boxShadow: '0 8px 20px rgba(0,0,0,0.02)' }}>
                    
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', backgroundColor: '#fff', padding: '25px', borderRadius: '25px', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                         <h5 style={{margin:0, color:FUCSIA_PRINCIPAL, fontWeight:'900'}}>CORREGIR DATOS DEL CLIENTE:</h5>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={s_input} placeholder="Nombre completo" />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                            <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={s_input} placeholder="Pueblo/Zona" />
                            <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={s_input} placeholder="Número WhatsApp" />
                         </div>
                         <div style={{ display:'flex', gap:'15px', marginTop:'10px' }}>
                            <button onClick={() => guardarEditHistorial(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', border:'none', padding:'20px', borderRadius:'18px', flex:2, fontWeight:'900', cursor:'pointer', fontSize:'15px' }}>ACTUALIZAR DATOS</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', border:'none', padding:'20px', borderRadius:'18px', flex:1, fontWeight:'900', cursor:'pointer', fontSize:'15px' }}>CANCELAR</button>
                         </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                          <strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '24px', fontWeight: '900', letterSpacing:'-0.5px' }}>{grupo.cliente_nombre}</strong>
                          <br/><small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '13px', marginTop: '8px', display: 'block', letterSpacing:'0.5px' }}>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '12px 25px', borderRadius: '18px', fontWeight: '900', fontSize: '20px', boxShadow: '0 8px 15px rgba(22, 163, 74, 0.3)' }}>S/ {grupo.total.toFixed(2)}</div>
                           {/* BOTÓN WHATSAPP */}
                           <button onClick={() => enviarWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px 22px', borderRadius: '18px', cursor:'pointer', fontWeight:'900', fontSize:'14px', boxShadow:'0 5px 15px rgba(37, 211, 102, 0.3)' }}>ENVIAR TICKET 📱</button>
                           <button onClick={() => prepararEditHistorial(grupo)} title="Editar cliente" style={{ border:'none', background:'#fff', padding:'15px', borderRadius:'18px', cursor:'pointer', border:'2px solid #FCC2E2', fontSize: '1.4rem' }}>✏️</button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 5px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ fontSize: '16px' }}>
                                <strong style={{ color: '#1E1B1C', fontSize: '19px' }}>{v.cantidad}x</strong> <span style={{fontWeight:'500'}}>{productos.find(p => p.id === v.producto_id)?.nombre || 'Modelo cargado'}</span>
                                <br/><small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase', fontSize: '11px', marginTop:'5px', display:'block' }}>🎨 COLOR: {v.color} | {v.estado_pedido==='En Almacén' ? '📦 GUARDADO EN ALMACÉN' : '✅ YA ENTREGADO'}</small>
                            </div>
                            <div style={{ display:'flex', gap:'25px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '19px', color:'#1E1B1C' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => anularItemUnico(v)} title="Anular este ítem" style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '24px', transition:'0.2s' }}>🗑️</button>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================================================== */}
        {/* [TAB 2] LOGÍSTICA (PRODUCTOS POR ENTREGAR)                                                         */}
        {/* =================================================================================================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...estiloCard, backgroundColor: '#1E1B1C', color: '#fff', padding: '60px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: '900', letterSpacing: '-1.5px' }}>📦 Centro de Entregas</h2>
                <p style={{ opacity: 0.7, fontSize: '19px', marginTop: '15px', maxWidth:'700px', margin:'15px auto' }}>Visualiza todos los productos que ya cobraste pero que siguen esperando ser retirados físicamente.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '35px' }}>
                {pendientesAlmacen.length === 0 ? (
                    <div style={{textAlign:'center', padding:'150px', opacity:0.3, gridColumn: '1/-1'}}><h3>✨ ¡Perfecto! No hay pedidos pendientes de entrega.</h3></div>
                ) : pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...estiloCard, borderLeft: `18px solid ${FUCSIA_PRINCIPAL}`, transition: '0.4s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '2rem', fontWeight: '900' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '16px', color: '#64748B', fontWeight:'900', margin: '10px 0', textTransform: 'uppercase', letterSpacing: '1.2px' }}>📍 ZONA: {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Te saluda el equipo de *B J Importaciones Chiclayo*. Te recordamos que tienes mercadería lista para retirar en el local. ¡Pasa cuando gustes! ✨📦`;
                                window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '16px 25px', borderRadius: '18px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(37, 211, 102, 0.4)' }}>AVISAR 📱</button>
                        </div>
                        
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '30px', padding: '30px', marginBottom: '35px', border: '1px solid #E2E8F0' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', padding: '15px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '2px solid #E2E8F0' }}>
                                    <span><strong style={{ color: '#1E1B1C', fontSize:'20px' }}>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre || 'Producto'} <br/><small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, fontSize:'11px' }}>VARIACIÓN: {it.color}</small></span>
                                    <strong style={{ alignSelf: 'center', fontSize: '19px', color: '#1E1B1C' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'30px', borderTop:'5px solid #E2E8F0', paddingTop: '22px'}}>
                                <small style={{ fontWeight:'900', color: '#64748B', textTransform:'uppercase', fontSize:'13px' }}>VALOR TOTAL DEL PEDIDO: </small>
                                <strong style={{ color: '#16A34A', fontSize:'2.2rem', fontWeight: '900', display: 'block' }}>S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        
                        <button onClick={async () => { 
                            if(confirm(`¿Confirmas que entregaste físicamente todo el pedido a ${grupo.cliente}?`)) { 
                                for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); 
                                alert("✅ ¡Entregado! Se ha actualizado el sistema."); 
                            } 
                        }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '25px', fontWeight: '900', cursor: 'pointer', fontSize: '18px', boxShadow: '0 15px 30px rgba(0,0,0,0.3)' }}>
                            ✅ MARCAR TODO COMO ENTREGADO
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* =================================================================================================== */}
        {/* [TAB 3] GESTIÓN (ADMINISTRACIÓN Y FINANZAS)                                                        */}
        {/* =================================================================================================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* PANEL DE VALORIZACIÓN DE CAPITAL */}
            <div style={{ ...estiloCard, border: `5px solid ${FUCSIA_PRINCIPAL}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-30px', top: '-30px', fontSize: '10rem', opacity: 0.04 }}>💎</div>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontSize: '2rem', fontWeight: '900', letterSpacing: '-1px' }}>💎 Auditoría de Capital y Stock</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '35px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '35px', borderRadius: '32px', border: '1px solid #E2E8F0' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1.5px' }}>Dinero Invertido (Costo)</small>
                        <h3 style={{ margin: '15px 0', fontSize: '2.8rem', fontWeight: '900', color: '#1E1B1C' }}>S/ {valorizacionInventario.sumCosto.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>Este es el capital real que tienes en mercadería.</p>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '35px', borderRadius: '32px', border: `1px solid ${FUCSIA_PRINCIPAL}40` }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1.5px' }}>Retorno al Mayor (Venta)</small>
                        <h3 style={{ margin: '15px 0', fontSize: '2.8rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {valorizacionInventario.sumVenta.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#F786C1', fontWeight: '600' }}>Dinero que entrará al vender todo el stock.</p>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '35px', borderRadius: '32px', border: '1px solid #BBF7D0' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '1.5px' }}>Utilidad Proyectada</small>
                        <h3 style={{ margin: '15px 0', fontSize: '2.8rem', fontWeight: '900', color: '#16A34A' }}>S/ {valorizacionInventario.sumUtilidad.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#16A34A', fontWeight: '600' }}>Tu margen neto de ganancia al liquidar tienda.</p>
                    </div>
                </div>
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#1E1B1C', color: '#fff', display: 'inline-block', padding: '15px 45px', borderRadius: '25px', fontWeight: '900', fontSize: '17px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                       📦 CONTENIDO TOTAL: {valorizacionInventario.sumUnidades} UNIDADES EN ALMACÉN
                    </div>
                </div>
            </div>

            {/* BALANCE CONTABLE GLOBAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px' }}>
              <div style={{ ...estiloCard, borderLeft: `12px solid ${FUCSIA_PRINCIPAL}`, padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '12px', textTransform: 'uppercase' }}>EGRESOS TOTALES</small>
                <h4 style={{ fontSize: '2rem', margin: '10px 0', fontWeight: '900' }}>S/ {balanceGlobal.egresos.toFixed(2)}</h4>
              </div>
              <div style={{ ...estiloCard, borderLeft: '12px solid #16A34A', padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '12px', textTransform: 'uppercase' }}>INGRESOS EXTRAS</small>
                <h4 style={{ fontSize: '2rem', margin: '10px 0', fontWeight: '900' }}>S/ {balanceGlobal.ingresosExtras.toFixed(2)}</h4>
              </div>
              <div style={{ ...estiloCard, borderLeft: '12px solid #3B82F6', padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '12px', textTransform: 'uppercase' }}>GANANCIA NETA REAL</small>
                <h4 style={{ fontSize: '2rem', margin: '10px 0', fontWeight: '900' }}>S/ {balanceGlobal.gananciaReal.toFixed(2)}</h4>
              </div>
              <div style={{ ...estiloCard, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '25px 35px', boxShadow: `0 15px 30px ${FUCSIA_PRINCIPAL}40` }}>
                <small style={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}>EFECTIVO FÍSICO CAJA</small>
                <h4 style={{ fontSize: '2.2rem', margin: '10px 0', fontWeight: '900' }}>S/ {balanceGlobal.cajaEfectivo.toFixed(2)}</h4>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '45px' }}>
              
              {/* COLUMNA IZQUIERDA: REGISTROS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                
                {/* REGISTRAR GASTO/INGRESO */}
                <div style={estiloCard}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem', color:'#1E1B1C' }}>💸 Registrar Movimiento de Caja</h4>
                  <form onSubmit={registrarGastoManual} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={estiloInput}>
                      <option value="Gasto Local">🏪 Gasto Local (Servicios, Local)</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Compra de Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal (Retiro de Dueño)</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional (Otras Ventas)</option>
                      <option value="Inversión Inicial">💵 Inversión Inicial (Capital Externo)</option>
                    </select>
                    <input placeholder="Descripción del movimiento..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={estiloInput} />
                    <input type="text" placeholder="Monto S/ (Ej: 100.50)" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={estiloInput} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '20px', fontWeight: '900', cursor:'pointer', fontSize: '16px', transition: '0.3s' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                
                {/* CARGAR PRODUCTO NUEVO */}
                <div style={{ ...estiloCard, border: `4px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem', color:'#1E1B1C' }}>🆕 Subir Nuevo Producto al Catálogo</h4>
                  <form onSubmit={addNuevoProducto} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <input placeholder="Nombre completo del Producto" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={estiloInput} />
                    <input placeholder="Colores (Separar con comas: Azul, Rojo, Negro)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={estiloInput} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                        <div>
                            <label style={{fontSize:'12px', fontWeight:'900', color:'#64748B', marginLeft:'15px'}}>COSTO UNITARIO S/</label>
                            <input type="text" placeholder="Precio Compra" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={estiloInput} />
                        </div>
                        <div>
                            <label style={{fontSize:'12px', fontWeight:'900', color:'#64748B', marginLeft:'15px'}}>STOCK INICIAL</label>
                            <input type="number" placeholder="Cantidad" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={estiloInput} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                        <div>
                            <label style={{fontSize:'12px', fontWeight:'900', color:FUCSIA_PRINCIPAL, marginLeft:'15px'}}>P. MAYORISTA S/</label>
                            <input type="text" placeholder="Venta Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...estiloInput, border:'3px solid #F786C1'}} />
                        </div>
                        <div>
                            <label style={{fontSize:'12px', fontWeight:'900', color:'#1E1B1C', marginLeft:'15px'}}>P. MINORISTA S/</label>
                            <input type="text" placeholder="Venta Menor" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...estiloInput, border:'3px solid #1E1B1C'}} />
                        </div>
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', fontSize: '17px', marginTop: '15px', boxShadow: '0 12px 25px rgba(0,0,0,0.2)' }}>REGISTRAR NUEVO MODELO</button>
                  </form>
                </div>
              </div>

              {/* COLUMNA DERECHA: EDICIÓN Y AUDITORÍA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                
                {/* AJUSTE RÁPIDO DE STOCK */}
                <div style={estiloCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>🔧 Control Rápido de Stock</h4>
                  <input placeholder="🔍 Busca un modelo para editar o borrar..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...estiloInput, padding: '15px', marginBottom: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const tagP = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '30px', backgroundColor: '#fff', boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', alignItems: 'center' }}>
                              <div style={{ flex:1 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {tagP && <span style={{ backgroundColor: tagP.color, color:'#fff', fontWeight: '900', fontSize: '10px', padding: '5px 12px', borderRadius: '12px' }}>{tagP.icono} {tagP.tipo}</span>}
                                    <strong style={{ fontSize: '18px', color: '#1E1B1C' }}>{p.nombre}</strong>
                                 </div>
                                 <small style={{ color: '#64748B', fontWeight: '900', display: 'block', marginTop: '8px', textTransform: 'uppercase', fontSize: '11px' }}>Costo: S/ {p.precio_compra} | Mayor: S/ {p.precio_venta}</small>
                              </div>
                              <button onClick={() => borrarProductoTotal(p)} title="Borrar Producto" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '2rem' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '22px', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: '900', color: '#64748B' }}>UNIDADES EN TIENDA:</span>
                              <input 
                                type="number" 
                                value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} 
                                onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} 
                                style={{ width: '95px', padding: '12px', borderRadius: '15px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '18px', fontWeight: '900', outline: 'none' }} 
                              />
                              <button onClick={() => actualizarStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', cursor:'pointer', flex: 1 }}>SINCRONIZAR</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* LIBRO DIARIO DE FINANZAS */}
                <div style={cardBJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario de Finanzas</h4>
                  <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '4px solid #F1F5F9' }}>
                           <th style={{ padding: '15px 8px' }}>DETALLE MOVIMIENTO</th>
                           <th style={{ padding: '15px 8px', textAlign: 'right' }}>VALOR</th>
                           <th style={{ padding: '15px 8px', textAlign: 'right' }}>OPCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={{...s_input, padding:'12px'}}>
                                          <option value="Gasto Local">Gasto Local</option>
                                          <option value="Inversión (Mercadería)">Inversión (Mercadería)</option>
                                          <option value="Retiro Personal">Retiro Personal</option>
                                          <option value="Ingreso Adicional">Ingreso Adicional</option>
                                          <option value="Inversión Inicial">Inversión Inicial</option>
                                      </select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={{...s_input, padding:'12px'}} placeholder="Descripción" />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={{...s_input, padding:'12px'}} placeholder="Monto S/" />
                                      <div style={{display:'flex', gap:'15px', marginTop: '8px'}}>
                                          <button onClick={updateGastoDiario} style={{backgroundColor:'#16A34A', color:'#fff', padding:'18px', borderRadius:'15px', border:'none', cursor:'pointer', flex:2, fontWeight:'900'}}>GUARDAR</button>
                                          <button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'18px', borderRadius:'15px', border:'none', cursor:'pointer', flex:1, fontWeight:'900'}}>X</button>
                                      </div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '20px 8px' }}>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase', fontSize: '10px', letterSpacing: '0.8px'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize: '15px', color: '#1E1B1C' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '20px 8px', fontWeight: '900', fontSize: '17px', color: f.tipo.includes('Ingreso') ? '#16A34A' : '#1E1B1C' }}>
                                    S/ {Number(f.monto).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '20px 8px' }}>
                                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                      <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'#F1F5F9', border:'none', padding:'12px', borderRadius:'14px', cursor:'pointer', fontSize: '1.2rem'}}>✏️</button>
                                      <button onClick={async ()=> { if(confirm("¿Anular este movimiento?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'#FFF1F2', border:'none', color: FUCSIA_PRINCIPAL, padding:'12px', borderRadius:'14px', cursor:'pointer', fontSize: '1.2rem'}}>🗑️</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRÁFICO RECHARTS DE RETORNO */}
                <div style={estiloCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📈 Rendimiento de Inversión</h4>
                  <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                        <YAxis fontSize={13} axisLine={false} tickLine={false} />
                        <Tooltip 
                            formatter={(val)=> `S/ ${val.toLocaleString()}`} 
                            contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900', padding:'15px' }} 
                        />
                        <Bar dataKey="value" radius={[20, 20, 0, 0]} barSize={70} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '25px', padding: '25px', backgroundColor: '#F0FDF4', borderRadius: '25px', border: '2px solid #BBF7D0' }}>
                    <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1.5px' }}>Diferencia a favor del negocio: </small>
                    <strong style={{ color: '#16A34A', fontSize: '1.6rem', display: 'block', fontWeight: '900', marginTop:'5px' }}>+ S/ {valorizacionInventario.sumUtilidad.toLocaleString()}</strong>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}