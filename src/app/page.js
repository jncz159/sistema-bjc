"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [1] UTILIDADES DE FORMATO Y TIEMPO (HELPERS)
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
  // [2] ESTADOS DEL SISTEMA (STATE)
  // ============================================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- BUSCADORES ---
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // --- ESTADOS DE VENTA ACTUAL ---
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // --- EDICIÓN HISTORIAL ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  
  // --- EDICIÓN GESTIÓN ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  
  // --- FORMULARIOS ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ============================================================
  // [3] CONEXIÓN CON SUPABASE (REALTIME)
  // ============================================================

  useEffect(() => {
    document.title = "B J Importaciones | Gestión Pro";
    cargarTodo();

    const canalVentas = supabase.channel('master-v29-ventas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .subscribe();

    const canalProductos = supabase.channel('master-v29-prod')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .subscribe();

    const canalFinanzas = supabase.channel('master-v29-fin')
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
        console.error("Error al cargar datos:", err);
    }
  };

  // ============================================================
  // [4] LÓGICA DE NEGOCIO Y CÁLCULOS (MEMOS)
  // ============================================================

  // --- LOGÍSTICA: TODO LO "EN ALMACÉN" ---
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

  // --- VENTAS: AGRUPAR POR CLIENTE ---
  const historialVentasHoy = useMemo(() => {
    if (!ventas) return [];
    const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
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

  // --- CAJA DIARIA ---
  const cajaDelDia = useMemo(() => {
    const hoy = getFechaPeru();
    const vHoy = (ventas || []).filter(v => getFechaPeru(v.created_at) === hoy);
    return { 
      totalCaja: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0),
      totalGanancia: vHoy.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0)
    };
  }, [ventas]);

  // --- BALANCE GLOBAL ---
  const balanceContable = useMemo(() => {
    const listFinanzas = finanzas || [];
    const listVentas = ventas || [];
    
    const egresos = listFinanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const extras = listFinanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto || 0), 0);
    const ventasBrutas = listVentas.reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
    const gananciaNetaReal = listVentas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    
    return { 
        egresos, 
        ingresosExtras: extras, 
        gananciaNetaReal, 
        efectivoEnCaja: (ventasBrutas + extras - egresos) 
    };
  }, [finanzas, ventas]);

  // --- VALORIZACIÓN DE STOCK ---
  const valorizacionInventario = useMemo(() => {
    let sumCosto = 0; let sumVenta = 0; let sumUnidades = 0;
    (productos || []).forEach(p => { 
      const stockNum = Number(p.stock || 0);
      if (stockNum > 0) { 
        sumCosto += (Number(p.precio_compra || 0) * stockNum); 
        sumVenta += (Number(p.precio_venta || 0) * stockNum); 
        sumUnidades += stockNum; 
      } 
    });
    return { sumCosto, sumVenta, sumUnidades, sumUtilidad: sumVenta - sumCosto };
  }, [productos]);

  const chartData = [
    { name: 'Inversión', value: valorizacionInventario.sumCosto || 0, fill: '#1E1B1C' },
    { name: 'Retorno', value: valorizacionInventario.sumVenta || 0, fill: FUCSIA_PRINCIPAL }
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
    const factorDescuento = totalBruto > 0 ? (Number(descuento) / totalBruto) : 0;

    const itemsParaInsertar = carrito.map(i => {
      const pUnit = Number(i.precio_venta || 0);
      const sub = pUnit * i.cantidad;
      const gan = ((pUnit - Number(i.precio_compra || 0)) * i.cantidad) - (sub * factorDescuento);
      return { 
        cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: pUnit, 
        precio_costo_unitario: Number(i.precio_compra || 0), 
        ganancia_total: gan, 
        estado_pedido: estado 
      };
    });

    const { error } = await supabase.from('ventas').insert(itemsParaInsertar);
    if (!error) {
      for (const item of carrito) {
        const prodMatch = productos.find(p => p.id === item.producto_id);
        await supabase.from('productos').update({ stock: prodMatch.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta registrada.");
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
      
      {/* 🚀 CABECERA COMPLETA */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 20px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.5rem', boxShadow: `0 5px 15px ${FUCSIA_PRINCIPAL}40` }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: FUCSIA_PRINCIPAL, letterSpacing: '-0.8px' }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase', letterSpacing:'1px' }}>Dashboard Chiclayo v29</small>
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
        {/* [TAB 1] VENTAS                                                                                     */}
        {/* =================================================================================================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={s_card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '14px' }}>💰 CAJA HOY</span>
                  <button onClick={exportarExcelCaja} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '8px 20px', borderRadius: '12px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>EXCEL CIERRE</button>
                </div>
                <h2 style={{ margin: '20px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {cajaDelDia.totalCaja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '16px', backgroundColor: '#F0FDF4', padding: '10px 20px', borderRadius: '15px', display: 'inline-block' }}>Ganancia Est.: S/ {cajaDelDia.totalGanancia.toFixed(2)}</div>
              </div>
              <div style={s_card}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '14px' }}>📅 BUSCAR HISTORIAL</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...s_input, marginTop: '10px' }} />
              </div>
            </div>

            <div style={{ ...s_card, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.6rem', fontWeight: '900' }}>🛒 Registrar Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '12px 25px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '12px 25px', borderRadius: '14px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                <input list="data_clientes" placeholder="👤 Cliente" value={cliente} onChange={handleClienteChange} style={s_input} />
                <datalist id="data_clientes">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={s_input} />
                <input placeholder="📍 Zona / Pueblo" value={localidad} onChange={e => setLocalidad(e.target.value)} style={s_input} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '30px', padding: '35px', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {carrito.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FCC2E2', paddingBottom: '18px' }}>
                        <div style={{ flex: 1 }}>
                            <strong style={{ color: '#1E1B1C', fontSize: '18px' }}>{item.cantidad}x</strong> {item.nombre}
                            <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>COLOR: {item.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 18px', borderRadius: '15px', border: '2px solid #FCA5D4' }}>
                             <span style={{ fontSize: '14px', fontWeight: '900' }}>S/</span>
                             <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '85px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                          </div>
                          <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '42px', height: '42px', cursor: 'pointer' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent:'flex-end', marginBottom:'10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#64748B' }}>DESCUENTO S/</span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '14px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900' }} />
                    </div>
                    <h3 style={{ margin: '15px 0', fontSize: '2.8rem', color: '#1E1B1C', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '25px' }}>
                    <button onClick={() => ejecutarVenta('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px' }}>✅ COMPLETAR Y ENTREGAR</button>
                    <button onClick={() => ejecutarVenta('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px' }}>📦 PAGADO - EN ALMACÉN</button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '30px', position: 'relative' }}>
                <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...s_input, paddingLeft: '65px', height: '70px', fontSize: '19px' }} />
                <span style={{ position: 'absolute', left: '25px', top: '20px', fontSize: '1.8rem' }}>🔍</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '700px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '25px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tag && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tag.color, color: '#fff', fontSize: '11px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tag.tipo} {tag.icono}</span>}
                      <strong style={{ display: 'block', height: '48px', overflow: 'hidden', fontSize: '17px', color: '#1E1B1C', marginBottom: '15px' }}>{p.nombre}</strong>
                      <div style={{ margin: '15px 0', padding: '12px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: p.stock < 5 ? '#E11D48' : '#16A34A' }}>STOCK: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...s_input, padding: '10px', fontSize: '14px', marginBottom: '20px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '22px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: '2px solid #E2E8F0', background: '#fff', borderRadius: '18px', width: '50px', height: '50px' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '24px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: '2px solid #E2E8F0', background: '#fff', borderRadius: '18px', width: '50px', height: '50px' }}>+</button>
                      </div>
                      <button onClick={() => addCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '20px', borderRadius: '22px', fontSize: '15px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s_card}>
              <h4 style={{ margin: 0, marginBottom: '35px', color: '#64748B', fontSize: '15px', fontWeight: '900' }}>📜 HISTORIAL DE VENTAS</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `1px solid #FCC2E2` }}>
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={s_input} placeholder="Cliente" />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                            <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={s_input} placeholder="Zona" />
                            <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={s_input} placeholder="WhatsApp" />
                         </div>
                         <div style={{ display:'flex', gap:'15px', marginTop:'10px' }}>
                            <button onClick={() => guardarEditHistorial(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', padding:'20px', borderRadius:'18px', flex:2, fontWeight:'900' }}>GUARDAR</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', padding:'20px', borderRadius:'18px', flex:1, fontWeight:'900' }}>X</button>
                         </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                          <strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '24px', fontWeight: '900' }}>{grupo.cliente_nombre}</strong>
                          <br/><small style={{ fontWeight: '900', color: '#64748B' }}>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '12px 25px', borderRadius: '18px', fontWeight: '900', fontSize: '20px' }}>S/ {grupo.total.toFixed(2)}</div>
                           <button onClick={() => enviarWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px 22px', borderRadius: '18px', cursor:'pointer', fontWeight:'900' }}>TICKET 📱</button>
                           <button onClick={() => prepararEditHistorial(grupo)} style={{ border:'none', background:'#fff', padding:'15px', borderRadius:'18px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '16px' }}><strong>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre || 'Modelo'}<br/><small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : '✅ ENTREGADO'}</small></div>
                            <div style={{ display:'flex', gap:'25px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '19px' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => anularItemUnico(v)} style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '24px' }}>🗑️</button>
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
        {/* [TAB 2] LOGÍSTICA                                                                                  */}
        {/* =================================================================================================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...s_card, backgroundColor: '#1E1B1C', color: '#fff', padding: '60px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: '900' }}>📦 Entregas Pendientes</h2>
                <p style={{ opacity: 0.7, fontSize: '19px', marginTop: '15px' }}>Visualiza todo lo que ya cobraste pero que sigue guardado en almacén.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '35px' }}>
                {pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...s_card, borderLeft: `18px solid ${FUCSIA_PRINCIPAL}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '2rem', fontWeight: '900' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '16px', color: '#64748B', fontWeight:'900', margin: '10px 0' }}>📍 ZONA: {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido en B J Importaciones está listo para retirar. ✨📦`;
                                window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '16px 25px', borderRadius: '18px', fontWeight: '900' }}>AVISAR 📱</button>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '30px', padding: '30px', marginBottom: '35px' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', padding: '15px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '2px solid #E2E8F0' }}>
                                    <span><strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre || 'Producto'}</span>
                                    <strong style={{ fontSize: '19px' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'30px', borderTop:'5px solid #E2E8F0', paddingTop: '22px'}}>
                                <strong style={{ color: '#16A34A', fontSize:'2.2rem', fontWeight: '900' }}>TOTAL: S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        <button onClick={async () => { 
                            if(confirm(`¿Confirmas entrega a ${grupo.cliente}?`)) { 
                                for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); 
                                alert("✅ Entregado!"); 
                            } 
                        }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '25px', fontWeight: '900', fontSize: '18px' }}>MARCAR TODO ENTREGADO</button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* =================================================================================================== */}
        {/* [TAB 3] GESTIÓN (CORREGIDO PARA NO FALLAR)                                                        */}
        {/* =================================================================================================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            {/* VALORIZACIÓN DE CAPITAL */}
            <div style={{ ...s_card, border: `5px solid ${FUCSIA_PRINCIPAL}`, position: 'relative' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontSize: '2rem', fontWeight: '900' }}>💎 Auditoría de Stock y Capital</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '35px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '35px', borderRadius: '32px' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>Inversión (Costo)</small>
                        <h3 style={{ margin: '15px 0', fontSize: '2.8rem', fontWeight: '900' }}>S/ {(valorizacionInventario.sumCosto || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '35px', borderRadius: '32px' }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase' }}>Retorno al Mayor</small>
                        <h3 style={{ margin: '15px 0', fontSize: '2.8rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {(valorizacionInventario.sumVenta || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '35px', borderRadius: '32px' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase' }}>Utilidad Proyectada</small>
                        <h3 style={{ margin: '15px 0', fontSize: '2.8rem', fontWeight: '900', color: '#16A34A' }}>S/ {(valorizacionInventario.sumUtilidad || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                </div>
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#1E1B1C', color: '#fff', display: 'inline-block', padding: '15px 45px', borderRadius: '25px', fontWeight: '900', fontSize: '17px' }}>
                       📦 STOCK TOTAL: {valorizacionInventario.sumUnidades || 0} UNIDADES
                    </div>
                </div>
            </div>

            {/* BALANCE FINANCIERO GLOBAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px' }}>
              <div style={{ ...s_card, borderLeft: `12px solid ${FUCSIA_PRINCIPAL}`, padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, textTransform: 'uppercase' }}>EGRESOS</small>
                <h4 style={{ fontSize: '2rem', margin: '10px 0', fontWeight: '900' }}>S/ {(balanceContable.egresos || 0).toFixed(2)}</h4>
              </div>
              <div style={{ ...s_card, borderLeft: '12px solid #16A34A', padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, textTransform: 'uppercase' }}>EXTRAS</small>
                <h4 style={{ fontSize: '2rem', margin: '10px 0', fontWeight: '900' }}>S/ {(balanceContable.ingresosExtras || 0).toFixed(2)}</h4>
              </div>
              <div style={{ ...s_card, borderLeft: '12px solid #3B82F6', padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, textTransform: 'uppercase' }}>GANANCIA REAL</small>
                <h4 style={{ fontSize: '2rem', margin: '10px 0', fontWeight: '900' }}>S/ {(balanceContable.gananciaNetaReal || 0).toFixed(2)}</h4>
              </div>
              <div style={{ ...s_card, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '25px 35px' }}>
                <small style={{ fontWeight: '900', textTransform: 'uppercase' }}>CAJA ACTUAL</small>
                <h4 style={{ fontSize: '2.2rem', margin: '10px 0', fontWeight: '900' }}>S/ {(balanceContable.efectivoEnCaja || 0).toFixed(2)}</h4>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '45px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                
                {/* REGISTRAR MOVIMIENTO */}
                <div style={s_card}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>💸 Movimiento de Caja</h4>
                  <form onSubmit={registrarGastoManual} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={s_input}>
                      <option value="Gasto Local">🏪 Gasto Local</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                      <option value="Inversión Inicial">💵 Inversión Inicial</option>
                    </select>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={s_input} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={s_input} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '20px', fontWeight: '900', cursor:'pointer' }}>GUARDAR MOVIMIENTO</button>
                  </form>
                </div>
                
                {/* CARGAR PRODUCTO */}
                <div style={{ ...s_card, border: `4px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>🆕 Cargar Nuevo Modelo</h4>
                  <form onSubmit={addNuevoProducto} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <input placeholder="Nombre del Producto" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={s_input} />
                    <input placeholder="Colores (comas)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={s_input} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={s_input} />
                        <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={s_input} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                        <input type="text" placeholder="P. MAYORISTA" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...s_input, border:'3px solid #F786C1'}} />
                        <input type="text" placeholder="P. MINORISTA" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...s_input, border:'3px solid #1E1B1C'}} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '22px', fontWeight: '900' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                
                {/* AJUSTE STOCK */}
                <div style={s_card}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>🔧 Control de Stock</h4>
                  <input placeholder="🔍 Buscar modelo..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...s_input, padding: '15px', marginBottom: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '550px', overflowY: 'auto', paddingRight: '15px' }}>
                    {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const t = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '30px', backgroundColor: '#fff', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}>
                              <div>
                                  <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                                    {t && <span style={{backgroundColor: t.color, color:'#fff', fontWeight: '900', fontSize: '10px', padding: '5px 12px', borderRadius: '12px'}}>{t.icono} {t.tipo}</span>}
                                    <strong style={{fontSize:'18px'}}>{p.nombre}</strong>
                                  </div>
                              </div>
                              <button onClick={() => borrarProductoTotal(p)} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '2rem' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '22px', alignItems: 'center' }}>
                              <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '95px', padding: '12px', borderRadius: '15px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                              <button onClick={() => actualizarStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', flex: 1 }}>SINCRONIZAR</button>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>

                {/* LIBRO DIARIO EDITABLE */}
                <div style={s_card}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario</h4>
                  <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={s_input}><option value="Gasto Local">Gasto Local</option><option value="Inversión (Mercadería)">Inversión (Mercadería)</option><option value="Retiro Personal">Retiro Personal</option><option value="Ingreso Adicional">Ingreso Adicional</option><option value="Inversión Inicial">Inversión Inicial</option></select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={s_input} />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={s_input} />
                                      <div style={{display:'flex', gap:'15px'}}><button onClick={updateGastoDiario} style={{backgroundColor:'#16A34A', color:'#fff', padding:'18px', borderRadius:'15px', border:'none', flex:2, fontWeight:'900'}}>GUARDAR</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'18px', borderRadius:'15px', border:'none', flex:1}}>X</button></div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '20px 8px' }}><small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL}}>{f.tipo}</small><br/>{f.descripcion}</td>
                                <td style={{ textAlign: 'right', padding: '20px 8px', fontWeight: '900', fontSize: '17px' }}>S/ {Number(f.monto || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '20px 8px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.2rem', marginRight:'10px'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("Borrar?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.2rem'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRÁFICO RECHARTS (CORREGIDO) */}
                <div style={s_card}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📈 Salud Inversión</h4>
                  <div style={{ height: '350px', width: '100%' }}>
                    {valorizacionInventario.sumCosto > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="value" radius={[20, 20, 0, 0]} barSize={70} />
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