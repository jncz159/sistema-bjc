"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [1] UTILIDADES DE FORMATO, TIEMPO Y SEGURIDAD (HELPERS)
  // ============================================================

  // --- OBTENER FECHA ACTUAL EN CHICLAYO (GMT-5) ---
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
        return new Date().toISOString().split('T')[0];
    }
  };

  // --- OBTENER HORA EXACTA (12 HORAS AM/PM) ---
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        return new Date(dateInput).toLocaleTimeString('es-PE', { 
            timeZone: "America/Lima", 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    } catch (e) {
        return "--:--";
    }
  };

  // --- LIMPIEZA DE DECIMALES (COMAS A PUNTOS) ---
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return String(valor || '');
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // --- LÓGICA DE ETIQUETAS DE ANTIGÜEDAD ---
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
  // [2] ESTADOS DEL SISTEMA (STATE MANAGEMENT)
  // ============================================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- BUSCADORES Y FILTROS ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- FORMULARIO VENTA ACTUAL ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- EDICIÓN HISTORIAL (VENTAS) ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // --- EDICIÓN GESTIÓN (GASTOS Y PRODUCTOS) ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ============================================================
  // [3] CARGA DE DATOS Y TIEMPO REAL (SUPABASE)
  // ============================================================

  useEffect(() => {
    document.title = "B J Importaciones | Gestión Chiclayo";
    cargarTodo();

    const canalVentas = supabase.channel('master-v31-ventas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .subscribe();

    const canalProductos = supabase.channel('master-v31-prod')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .subscribe();

    const canalFinanzas = supabase.channel('master-v31-fin')
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
        console.error("Error crítico de carga:", err);
    }
  };

  // ============================================================
  // [4] LÓGICA DE NEGOCIO Y CÁLCULOS (USEMEMO)
  // ============================================================

  // --- LOGÍSTICA: BUSCA TODO LO "EN ALMACÉN" DE CUALQUIER DÍA ---
  const pendientesAlmacen = useMemo(() => {
    if (!ventas) return [];
    const enAlmacen = ventas.filter(v => v.estado_pedido === 'En Almacén');
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

  // --- HISTORIAL: AGRUPA VENTAS DEL DÍA POR CLIENTE Y HORA ---
  const historialVentasHoy = useMemo(() => {
    if (!ventas) return [];
    const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
    const grupos = {};
    filtradas.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}-${v.created_at?.substring(0,16)}`; 
      if (!grupos[key]) {
        grupos[key] = { id_grupo: key, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
      }
      grupos[key].items.push(v);
      grupos[key].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
    });
    return Object.values(grupos).reverse();
  }, [ventas, fechaConsulta]);

  // --- BALANCE CONTABLE Y CAJA ---
  const balanceCaja = useMemo(() => {
    const listFinanzas = finanzas || [];
    const listVentas = ventas || [];
    const hoy = getFechaPeru();
    
    const vHoy = listVentas.filter(v => getFechaPeru(v.created_at) === hoy);
    
    const egresos = listFinanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const extras = listFinanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const ventasBrutas = listVentas.reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
    const gananciaNetaReal = listVentas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    
    return { 
        cajaHoy: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0),
        gananciaHoy: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        egresosTotales: egresos,
        ingresosExtras: extras,
        gananciaNetaReal,
        efectivoActualCaja: (ventasBrutas + extras - egresos)
    };
  }, [finanzas, ventas]);

  // --- VALORIZACIÓN DE STOCK (INVERSIÓN) ---
  const valorizacionInventario = useMemo(() => {
    let costoTotal = 0; let ventaTotal = 0; let piezasTotal = 0;
    (productos || []).forEach(p => { 
      const stockActual = Number(p.stock || 0);
      if (stockActual > 0) { 
        costoTotal += (Number(p.precio_compra || 0) * stockActual); 
        ventaTotal += (Number(p.precio_venta || 0) * stockActual); 
        piezasTotal += stockActual; 
      } 
    });
    return { costoTotal, ventaTotal, piezasTotal, utilidadProyectada: ventaTotal - costoTotal };
  }, [productos]);

  const chartDataInversion = [
    { name: 'Inversión', value: valorizacionInventario.costoTotal || 0, fill: '#1E1B1C' },
    { name: 'Retorno', value: valorizacionInventario.ventaTotal || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [5] MANEJADORES DE ACCIONES (HANDLERS)
  // ============================================================

  // --- ACCIONES DE CARRITO Y VENTA ---
  const handleClienteChange = (e) => {
    const val = e.target.value; setCliente(val);
    const c = ventas.find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (c) { setLocalidad(c.localidad || ''); setTelefono(c.telefono || ''); }
  };

  const addAlCarrito = (p) => {
    const cant = Number(cantidades[p.id] || 1);
    const pVenta = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const yaEnCarrito = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    
    if (Number(p.stock || 0) < cant + yaEnCarrito) return alert(`No hay stock suficiente de ${p.nombre}.`);
    
    setCarrito([...carrito, { 
      producto_id: p.id, 
      nombre: p.nombre, 
      cantidad: cant, 
      color: coloresElegidos[p.id], 
      precio_venta: pVenta, 
      precio_compra: p.precio_compra 
    }]);
  };

  const enviarWhatsAppVenta = (grupo) => {
    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Ticket de compra de *B J Importaciones Chiclayo*.%0A%0A`;
    grupo.items.forEach(v => {
        const nomP = productos.find(p => p.id === v.producto_id)?.nombre || "Producto";
        msg += `- *${v.cantidad}x* ${nomP} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    msg += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias por tu compra! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const finalizarVentaFinal = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Faltan datos del cliente.");
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const factorD = totalV > 0 ? (Number(descuento) / totalV) : 0;

    const inserts = carrito.map(i => {
        const pv = Number(i.precio_venta);
        const sub = pv * i.cantidad;
        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv, 
            precio_costo_unitario: Number(i.precio_compra || 0), 
            ganancia_total: ((pv - Number(i.precio_compra)) * i.cantidad) - (sub * factorD), 
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
      alert("✅ Venta Guardada.");
    }
  };

  // --- ACCIONES DE EDICIÓN HISTORIAL ---
  const prepararEditCliente = (grupo) => {
    setEditandoGrupoId(grupo.id_grupo);
    setFormEditCliente({ nombre: grupo.cliente_nombre, localidad: grupo.localidad, telefono: grupo.telefono });
  };

  const guardarCambiosCliente = async (grupo) => {
    for (const item of grupo.items) {
      await supabase.from('ventas').update({
        cliente_nombre: formEditCliente.nombre,
        localidad: formEditCliente.localidad,
        telefono: formEditCliente.telefono
      }).eq('id', item.id);
    }
    setEditandoGrupoId(null);
    alert("✅ Datos actualizados.");
  };

  const guardarNuevaCantidad = async (v) => {
    const diferencia = nuevaCantVenta - v.cantidad;
    const prodRef = productos.find(p => p.id === v.producto_id);
    
    if (prodRef.stock < diferencia) return alert("Sin stock suficiente para aumentar.");

    const gananciaRecalculada = (v.precio_venta_unitario - v.precio_costo_unitario) * nuevaCantVenta;
    
    const { error } = await supabase.from('ventas').update({ 
        cantidad: nuevaCantVenta, 
        ganancia_total: gananciaRecalculada 
    }).eq('id', v.id);

    if (!error) {
        await supabase.from('productos').update({ stock: prodRef.stock - diferencia }).eq('id', prodRef.id);
        setIdItemVentaEditando(null);
        alert("✅ Cantidad corregida.");
    }
  };

  const anularItemVenta = async (v) => {
    if (confirm("¿Anular este ítem? El stock se devolverá.")) {
      const pCat = productos.find(pr => pr.id === v.producto_id);
      if (pCat) await supabase.from('productos').update({ stock: pCat.stock + v.cantidad }).eq('id', pCat.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // --- ACCIONES DE GESTIÓN ---
  const handleAddProducto = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre,
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)),
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock),
        colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Producto creado."); }
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
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Cantidad,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomP = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nomP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Cierre_BJ_Import_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ============================================================
  // [6] RENDERIZADO DE INTERFAZ (UI)
  // ============================================================

  const s_input = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const s_card = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 HEADER CON NAVEGACIÓN */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.5rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase' }}>CHICLAYO MAESTRO v31</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '12px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '20px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '13px' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '13px' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 25px', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '13px' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '35px 20px' }}>
        
        {/* ===================== [TAB VENTAS] ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={s_card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA HOY</span>
                  <button onClick={exportarExcelCaja} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '10px 18px', borderRadius: '12px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>EXCEL CIERRE</button>
                </div>
                <h2 style={{ margin: '20px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceCaja.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '16px', backgroundColor: '#F0FDF4', padding: '10px 20px', borderRadius: '15px', display: 'inline-block' }}>Ganancia: S/ {balanceCaja.gananciaHoy.toFixed(2)}</div>
              </div>
              <div style={s_card}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR OTRA FECHA</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...s_input, marginTop: '15px' }} />
              </div>
            </div>

            {/* PANEL DE PEDIDO */}
            <div style={{ ...s_card, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.6rem', fontWeight: '900' }}>🛒 Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '12px 25px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYORISTA</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '12px 25px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                <input list="data_cl" placeholder="👤 Cliente" value={cliente} onChange={handleClienteChange} style={s_input} />
                <datalist id="data_cl">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={s_input} />
                <input placeholder="📍 Zona / Pueblo" value={localidad} onChange={e => setLocalidad(e.target.value)} style={s_input} />
              </div>

              {/* CARRITO */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '30px', padding: '35px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FCC2E2', paddingBottom: '18px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>COLOR: {item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '90px', padding: '10px', borderRadius: '12px', border: '2px solid #FCA5D4', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent:'flex-end' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '15px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    </div>
                    <h3 style={{ margin: '15px 0', fontSize: '3rem', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '25px' }}>
                    <button onClick={() => finalizarVentaFinal('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '18px' }}>✅ PAGAR Y ENTREGAR</button>
                    <button onClick={() => finalizarVentaFinal('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '18px' }}>📦 PAGAR Y ALMACENAR</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...s_input, marginBottom: '25px', height: '65px', fontSize: '19px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '750px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '25px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tag && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tag.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tag.tipo} {tag.icono}</span>}
                      <strong style={{ display: 'block', height: '48px', overflow: 'hidden', fontSize: '17px', color: '#1E1B1C', marginBottom: '15px' }}>{p.nombre}</strong>
                      <div style={{ margin: '15px 0', padding: '12px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: p.stock < 5 ? '#E11D48' : '#16A34A' }}>DISPONIBLE: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...s_input, padding: '10px', fontSize: '14px', marginBottom: '20px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '25px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '45px', height: '45px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'8px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '45px', height: '45px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => addAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontSize: '15px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL CON HORARIO Y EDICIÓN DE CANTIDAD */}
            <div style={s_card}>
              <h4 style={{ margin: 0, marginBottom: '35px', color: '#64748B', fontSize: '15px', fontWeight: '900', textTransform:'uppercase' }}>📜 Ventas del Día Seleccionado</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.length === 0 ? <p style={{textAlign:'center', opacity:0.5, padding:'50px'}}>No hay registros para este día.</p> : historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `1px solid #FCC2E2` }}>
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', backgroundColor:'#fff', padding:'25px', borderRadius:'25px' }}>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={s_input} placeholder="Cliente" />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                            <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={s_input} placeholder="Zona" />
                            <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={s_input} placeholder="WhatsApp" />
                         </div>
                         <div style={{ display:'flex', gap:'15px', marginTop:'10px' }}>
                            <button onClick={() => guardarCambiosCliente(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', border:'none', padding:'20px', borderRadius:'18px', flex:2, fontWeight:'900' }}>GUARDAR CAMBIOS</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', border:'none', padding:'20px', borderRadius:'18px', flex:1, fontWeight:'900' }}>X</button>
                         </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                          <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL, textTransform:'uppercase' }}>⏰ Venta: {grupo.hora}</small>
                          <br/><strong style={{ color: '#1E1B1C', fontSize: '24px', fontWeight: '900' }}>{grupo.cliente_nombre}</strong>
                          <br/><small style={{ fontWeight: '900', color: '#64748B' }}>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '12px 25px', borderRadius: '18px', fontWeight: '900', fontSize: '20px' }}>S/ {grupo.total.toFixed(2)}</div>
                           <button onClick={() => enviarWhatsAppVenta(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px 22px', borderRadius: '18px', cursor:'pointer', fontWeight:'900', fontSize:'13px' }}>TICKET 📱</button>
                           <button onClick={() => prepararEditCliente(grupo)} style={{ border:'none', background:'#fff', padding:'15px', borderRadius:'18px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '17px' }}>
                                {idItemVentaEditando === v.id ? (
                                    <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                                        <input type="number" value={nuevaCantVenta} onChange={e=>setNuevaCantVenta(Number(e.target.value))} style={{ width:'80px', padding:'10px', borderRadius:'12px', border:'2px solid #FCA5D4', fontWeight:'900' }} />
                                        <button onClick={() => guardarNuevaCantidad(v)} style={{ background:'#16A34A', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'12px', fontWeight:'900' }}>OK</button>
                                        <button onClick={() => setIdItemVentaEditando(null)} style={{ background:'#64748B', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'12px', fontWeight:'900' }}>X</button>
                                    </div>
                                ) : (
                                    <>
                                        <strong>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre || 'Modelo'}<br/>
                                        <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : '✅ OK'}</small>
                                        <button onClick={() => { setIdItemVentaEditando(v.id); setNuevaCantVenta(v.cantidad); }} style={{ background:'none', border:'none', color:'#64748B', fontSize:'12px', textDecoration:'underline', cursor:'pointer', marginLeft:'15px', fontWeight:'bold' }}>Cambiar Cantidad</button>
                                    </>
                                )}
                            </div>
                            <div style={{ display:'flex', gap:'25px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '20px' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => anularItemVenta(v)} style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '26px' }}>🗑️</button>
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

        {/* ===================== [TAB LOGÍSTICA] ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...s_card, backgroundColor: '#1E1B1C', color: '#fff', padding: '60px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: '900' }}>📦 Entregas Pendientes Globales</h2>
                <p style={{ opacity: 0.7, fontSize: '20px', marginTop:'15px' }}>Mercadería pagada que sigue esperando ser retirada del almacén.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                {pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...s_card, borderLeft: `15px solid ${FUCSIA_PRINCIPAL}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'2rem' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '16px', color: '#64748B', fontWeight:'900', margin: '8px 0' }}>📍 ZONA: {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido de B J Importaciones está listo para retirar. ✨📦`;
                                window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '16px 25px', borderRadius: '18px', fontWeight:'900', cursor:'pointer' }}>AVISAR 📱</button>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '30px', padding: '30px', marginBottom: '30px' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', padding: '12px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '2px solid #E2E8F0' }}>
                                    <span><strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre || 'Producto'}</span>
                                    <strong style={{ fontSize:'20px' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'30px', borderTop:'5px solid #E2E8F0', paddingTop: '22px'}}>
                                <strong style={{ color: '#16A34A', fontSize:'2.2rem', fontWeight: '900' }}>TOTAL: S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        <button onClick={async () => { 
                            if(confirm(`¿Entrega completa a ${grupo.cliente}?`)) { 
                                for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); 
                                alert("✅ Entregado!"); 
                            } 
                        }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '25px', fontWeight: '900', fontSize: '18px', cursor:'pointer' }}>MARCAR TODO ENTREGADO ✅</button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== [TAB GESTIÓN] ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ ...s_card, border: `5px solid ${FUCSIA_PRINCIPAL}` }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize:'2rem' }}>📊 Análisis Financiero BJ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '35px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>Inversión (Costo)</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.8rem', fontWeight: '900' }}>S/ {(valorizacionInventario.costoTotal || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase' }}>Retorno Proyectado</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.8rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {(valorizacionInventario.ventaTotal || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase' }}>Utilidad en Almacén</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.8rem', fontWeight: '900', color: '#16A34A' }}>S/ {(valorizacionInventario.utilidadProyectada || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '25px' }}>
              <div style={{ ...s_card, borderLeft: `10px solid ${FUCSIA_PRINCIPAL}`, padding: '25px' }}><small style={{fontWeight:'bold', opacity:0.6}}>EGRESOS</small><h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {(balanceCaja.egresosTotales || 0).toFixed(2)}</h4></div>
              <div style={{ ...s_card, borderLeft: '10px solid #16A34A', padding: '25px' }}><small style={{fontWeight:'bold', opacity:0.6}}>INGRESOS EXTRAS</small><h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {(balanceCaja.ingresosExtras || 0).toFixed(2)}</h4></div>
              <div style={{ ...s_card, borderLeft: '10px solid #3B82F6', padding: '25px' }}><small style={{fontWeight:'bold', opacity:0.6}}>GANANCIA REAL</small><h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {(balanceCaja.gananciaNetaReal || 0).toFixed(2)}</h4></div>
              <div style={{ ...s_card, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '25px', boxShadow: `0 10px 25px ${FUCSIA_PRINCIPAL}40` }}><small style={{fontWeight:'bold'}}>CAJA EFECTIVO</small><h4 style={{fontSize:'2rem', margin:'10px 0'}}>S/ {(balanceCaja.efectivoActualCaja || 0).toFixed(2)}</h4></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '45px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={s_card}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize:'1.4rem' }}>💸 Movimiento de Caja</h4>
                  <form onSubmit={registrarGastoManual} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={s_input}>
                      <option value="Gasto Local">🏪 Gasto Local</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                    </select>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={s_input} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={s_input} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '20px', fontWeight: '900', cursor:'pointer' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                
                <div style={{ ...s_card, border: `4px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize:'1.4rem' }}>🆕 Subir Nuevo Producto</h4>
                  <form onSubmit={handleAddProducto} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <input placeholder="Nombre Completo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={s_input} />
                    <input placeholder="Colores (comas: Rojo, Negro, Dorado)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={s_input} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={s_input} />
                        <input type="number" placeholder="Stock Inicial" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={s_input} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="P. MAYOR" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...s_input, border:'3px solid #F786C1'}} />
                        <input type="text" placeholder="P. MINOR" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...s_input, border:'3px solid #1E1B1C'}} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '25px', fontWeight: '900', fontSize:'17px', cursor:'pointer' }}>REGISTRAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                
                <div style={s_card}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '30px', fontWeight: '900', fontSize:'1.4rem' }}>🔧 Ajuste Rápido de Stock</h4>
                  <input placeholder="🔍 Buscar para editar stock..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...s_input, padding: '15px', marginBottom: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '15px' }}>
                    {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const t = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '30px', backgroundColor: '#fff', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                                {t && <span style={{backgroundColor: t.color, color:'#fff', fontWeight: '900', fontSize: '10px', padding: '5px 12px', borderRadius: '12px'}}>{t.icono} {t.tipo}</span>}
                                <strong style={{fontSize:'18px'}}>{p.nombre}</strong>
                              </div>
                              <button onClick={() => eliminarProductoTotal(p)} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '2rem' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '22px', alignItems: 'center' }}>
                              <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '95px', padding: '12px', borderRadius: '15px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                              <button onClick={() => actualizarStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', flex: 1, cursor:'pointer' }}>GUARDAR</button>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>

                <div style={s_card}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Detallado</h4>
                  <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={s_input}><option value="Gasto Local">Gasto Local</option><option value="Inversión (Mercadería)">Inversión (Mercadería)</option><option value="Retiro Personal">Retiro Personal</option><option value="Ingreso Adicional">Ingreso Adicional</option></select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={s_input} />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={s_input} />
                                      <div style={{display:'flex', gap:'15px', marginTop: '10px'}}><button onClick={updateGastoDiario} style={{backgroundColor:'#16A34A', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:2, fontWeight:'900', cursor:'pointer'}}>GUARDAR</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:1, fontWeight:'900', cursor:'pointer'}}>X</button></div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '22px 10px' }}>
                                    {/* FECHAS EN LIBRO DIARIO ✅ */}
                                    <small style={{fontWeight:'900', color:'#64748B', display:'block', marginBottom:'5px'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize: '16px' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '22px 10px', fontWeight: '900', fontSize: '18px', color: f.tipo.includes('Ingreso') ? '#16A34A' : '#1E1B1C' }}>S/ {Number(f.monto || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '22px 10px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.4rem', marginRight:'12px'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("Borrar este registro?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.4rem'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={s_card}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 Rendimiento de Inversión</h4>
                  <div style={{ height: '350px', width: '100%' }}>
                    {valorizacionInventario.costoTotal > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataInversion} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="value" radius={[20, 20, 0, 0]} barSize={80} />
                        </BarChart>
                        </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}