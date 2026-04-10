"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell 
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [1] FUNCIONES DE AYUDA (HELPERS)
  // ============================================================

  // --- HORA EXACTA PERÚ (GMT-5 CHICLAYO) ---
  const getFechaPeru = (dateInput = new Date()) => {
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
  };

  // --- SOLUCIÓN AL PROBLEMA DE LAS COMAS PERUANAS ---
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return valor;
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // --- LÓGICA DE ETIQUETAS POR ANTIGÜEDAD ---
  const getEtiquetaProducto = (createdAt) => {
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
  // [2] ESTADOS DEL SISTEMA
  // ============================================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  // --- BUSCADORES Y FECHAS ---
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

  // --- ESTADOS DE EDICIÓN HISTORIAL ---
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  
  // --- ESTADOS DE EDICIÓN FINANZAS ---
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  
  // --- ESTADOS DE GESTIÓN PRODUCTOS ---
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ============================================================
  // [3] COMUNICACIÓN CON BASE DE DATOS (SUPABASE)
  // ============================================================

  useEffect(() => {
    document.title = "B J Importaciones | Panel Maestro";
    cargarTodo();

    const canalVentas = supabase.channel('master-ventas-v26')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => cargarTodo())
      .subscribe();

    const canalProductos = supabase.channel('master-productos-v26')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => cargarTodo())
      .subscribe();

    const canalFinanzas = supabase.channel('master-finanzas-v26')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finanzas' }, () => cargarTodo())
      .subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalFinanzas);
    };
  }, []);

  const cargarTodo = async () => {
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
  };

  // ============================================================
  // [4] CALCULOS INTELIGENTES (USEMEMO)
  // ============================================================

  // --- LOGÍSTICA: BUSCAR PENDIENTES DE CUALQUIER FECHA ---
  const pendientesAlmacen = useMemo(() => {
    const pend = ventas.filter(v => v.estado_pedido === 'En Almacén');
    const grupos = {};
    pend.forEach(v => {
      const key = `${v.cliente_nombre}-${v.localidad}`;
      if (!grupos[key]) {
        grupos[key] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], totalVenta: 0 };
      }
      grupos[key].items.push(v);
      grupos[key].totalVenta += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos);
  }, [ventas]);

  // --- HISTORIAL: AGRUPAR VENTAS DEL DÍA POR CLIENTE ---
  const historialVentasHoy = useMemo(() => {
    const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
    const grupos = {};
    filtradas.forEach(v => {
      // Agrupamos por nombre, zona y minuto exacto de compra
      const key = `${v.cliente_nombre}-${v.localidad}-${v.created_at.substring(0,16)}`; 
      if (!grupos[key]) {
        grupos[key] = { id_grupo: key, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, total: 0, items: [] };
      }
      grupos[key].items.push(v);
      grupos[key].total += (v.precio_venta_unitario * v.cantidad);
    });
    return Object.values(grupos).reverse();
  }, [ventas, fechaConsulta]);

  // --- RESUMEN DE CAJA DIARIA ---
  const totalesCajaHoy = useMemo(() => {
    const hoy = getFechaPeru();
    const vHoy = ventas.filter(v => getFechaPeru(v.created_at) === hoy);
    return { 
      caja: vHoy.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0),
      ganancia: vHoy.reduce((acc, v) => acc + v.ganancia_total, 0)
    };
  }, [ventas]);

  // --- BALANCE CONTABLE GLOBAL ---
  const balanceGlobal = useMemo(() => {
    const egresos = finanzas.filter(f => f.tipo === 'Gasto Local' || f.tipo === 'Inversión (Mercadería)' || f.tipo === 'Retiro Personal').reduce((acc, f) => acc + Number(f.monto), 0);
    const extras = finanzas.filter(f => f.tipo === 'Ingreso Adicional' || f.tipo === 'Inversión Inicial').reduce((acc, f) => acc + Number(f.monto), 0);
    const ventasBrutas = ventas.reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);
    const gananciaReal = ventas.reduce((acc, v) => acc + v.ganancia_total, 0);
    return { 
        gastos: egresos, 
        ingresosExtras: extras, 
        gananciaReal, 
        cajaEfectivo: ventasBrutas + extras - egresos 
    };
  }, [finanzas, ventas]);

  // --- VALORIZACIÓN DE STOCK ---
  const statsInventario = useMemo(() => {
    let costo = 0; let venta = 0; let totalUnidades = 0;
    productos.forEach(p => { 
      if (p.stock > 0) { 
        costo += (Number(p.precio_compra) * p.stock); 
        venta += (Number(p.precio_venta) * p.stock); 
        totalUnidades += p.stock; 
      } 
    });
    return { costo, venta, totalUnidades, utilidad: venta - costo };
  }, [productos]);

  // ============================================================
  // [5] MANEJADORES DE ACCIONES (HANDLERS)
  // ============================================================

  // --- ACCIONES DE VENTA ---
  const handleClienteChange = (e) => {
    const nom = e.target.value; setCliente(nom);
    const coincidencia = ventas.find(v => v.cliente_nombre.toLowerCase() === nom.toLowerCase());
    if (coincidencia) { 
        setLocalidad(coincidencia.localidad || ''); 
        setTelefono(coincidencia.telefono || ''); 
    }
  };

  const agregarAlCarrito = (p) => {
    const cant = cantidades[p.id] || 1;
    const precioBase = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const enCarrito = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    
    if (p.stock < cant + enCarrito) return alert(`¡STOCK AGOTADO! No hay suficientes unidades.`);
    
    setCarrito([...carrito, { 
      producto_id: p.id, 
      nombre: p.nombre, 
      cantidad: cant, 
      color: coloresElegidos[p.id], 
      precio_venta: precioBase, 
      precio_compra: p.precio_compra 
    }]);
  };

  const enviarWhatsAppTicket = (grupo) => {
    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Aquí tienes el resumen de tu compra en *B J Importaciones Chiclayo*.%0A%0A`;
    grupo.items.forEach(v => {
        const prod = productos.find(p => p.id === v.producto_id);
        msg += `- *${v.cantidad}x* ${prod?.nombre || 'Producto'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    msg += `%0A*TOTAL: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias por tu preferencia! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const finalizarVentaLote = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Faltan datos del cliente.");
    const totalVenta = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const factorDescuento = totalVenta > 0 ? (Number(descuento) / totalVenta) : 0;

    const itemsParaInsertar = carrito.map(i => {
      const pVenta = Number(i.precio_venta);
      const subTotal = pVenta * i.cantidad;
      return { 
        cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: pVenta, 
        precio_costo_unitario: i.precio_compra, 
        ganancia_total: ((pVenta - i.precio_compra) * i.cantidad) - (subTotal * factorDescuento), 
        estado_pedido: estado 
      };
    });

    const { error } = await supabase.from('ventas').insert(itemsParaInsertar);
    if (!error) {
      for (const item of carrito) {
        const pOrig = productos.find(p => p.id === item.producto_id);
        await supabase.from('productos').update({ stock: pOrig.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta registrada en el sistema.");
    }
  };

  // --- ACCIONES DE HISTORIAL (EDICIÓN) ---
  const prepararEdicionCliente = (grupo) => {
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

  const anularItemVenta = async (v) => {
    if (confirm("¿Seguro que quieres anular este ítem? El stock volverá al catálogo.")) {
      const prod = productos.find(pr => pr.id === v.producto_id);
      if (prod) await supabase.from('productos').update({ stock: prod.stock + v.cantidad }).eq('id', prod.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // --- ACCIONES DE GESTIÓN ---
  const registrarGasto = async (e) => {
    e.preventDefault();
    const montoLimpio = handleInputMonto(formFinanzas.monto);
    const { error } = await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(montoLimpio)}]);
    if(!error) { setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''}); alert("Movimiento guardado."); }
  };

  const registrarNuevoProducto = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre,
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)),
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock),
        colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Producto añadido."); }
  };

  const sincronizarStock = async (p) => {
    const ns = formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock;
    await supabase.from('productos').update({ stock: ns }).eq('id', p.id);
    alert("✅ Stock actualizado.");
  };

  const borrarProductoTotal = async (p) => {
    if (confirm(`¿ELIMINAR ${p.nombre} DEL SISTEMA? No podrás recuperar sus datos.`)) {
      await supabase.from('productos').delete().eq('id', p.id);
    }
  };

  const guardarEdicionGastoReal = async () => {
    const montoLimpio = handleInputMonto(String(formEditFinanza.monto));
    await supabase.from('finanzas').update({ 
        tipo: formEditFinanza.tipo, 
        descripcion: formEditFinanza.descripcion, 
        monto: Number(montoLimpio) 
    }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null);
    alert("✅ Gasto actualizado.");
  };

  const exportarRespaldoExcel = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Cliente,Pueblo,Estado,Producto,Cantidad,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nomP = productos.find(p=>p.id===v.producto_id)?.nombre || "Ítem";
      csv += `${getFechaPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${v.estado_pedido},${nomP},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Cierre_BJ_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ============================================================
  // [6] DISEÑO Y UI (RENDER)
  // ============================================================

  const estiloInput = { padding: '14px', borderRadius: '14px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const estiloCard = { backgroundColor: '#ffffff', borderRadius: '28px', padding: '25px', boxShadow: `0 15px 40px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🟢 HEADER DE CONTROL */}
      <header style={{ backgroundColor: '#ffffff', padding: '18px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>B J IMPORTACIONES</h1>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '16px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '30px 15px' }}>
        
        {/* ========================================================================================= */}
        {/* [PANTALLA 1] VENTAS                                                                       */}
        {/* ========================================================================================= */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* BOXES DE DINERO Y FECHA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={estiloCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 DINERO CAJA HOY</span>
                  <button onClick={exportarRespaldoExcel} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '8px 16px', borderRadius: '10px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '10px' }}>CIERRE DE CAJA</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.2rem', fontWeight: '900', letterSpacing: '-1px' }}>S/ {totalesCajaHoy.caja.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '15px', backgroundColor: '#F0FDF4', padding: '8px 15px', borderRadius: '12px', display: 'inline-block' }}>Ganancia Est.: S/ {totalesCajaHoy.ganancia.toFixed(2)}</div>
              </div>
              <div style={estiloCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 CONSULTAR HISTORIAL</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...estiloInput, marginTop: '15px' }} />
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#64748B', fontWeight: 'bold' }}>Solo se muestran las ventas de la fecha seleccionada.</p>
              </div>
            </div>

            {/* PANEL DE NUEVO PEDIDO */}
            <div style={{ ...estiloCard, border: `2px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.5rem', fontWeight: '900' }}>🛒 Registrar Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '15px', padding: '5px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYORISTA</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <div style={{ position:'relative' }}>
                    <input list="clients_list" placeholder="👤 Nombre del Cliente" value={cliente} onChange={handleClienteChange} style={estiloInput} />
                    <datalist id="clients_list">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                </div>
                <input placeholder="📱 WhatsApp (Celular)" value={telefono} onChange={e => setTelefono(e.target.value)} style={estiloInput} />
                <input placeholder="📍 Zona / Pueblo / Distrito" value={localidad} onChange={e => setLocalidad(e.target.value)} style={estiloInput} />
              </div>

              {/* CARRITO INTERACTIVO */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '35px' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px', color: FUCSIA_PRINCIPAL, fontSize: '15px', fontWeight: '900' }}>PRODUCTOS EN EL CARRITO:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {carrito.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <strong style={{ color: '#1E1B1C', fontSize: '18px' }}>{item.cantidad}x</strong> {item.nombre} 
                            <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '11px' }}>Color: {item.color}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '8px 15px', borderRadius: '15px', border: '2px solid #FCA5D4' }}>
                             <span style={{ fontSize: '13px', fontWeight: '900', color: '#94A3B8' }}>S/</span>
                             <input 
                                type="text" 
                                value={item.precio_venta} 
                                onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} 
                                style={{ width: '80px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '17px', fontWeight: '900', color: '#1E1B1C' }} 
                             />
                          </div>
                          <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#64748B' }}>DESCUENTO GLOBAL: S/</span>
                        <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '120px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize: '18px' }} />
                    </div>
                    <h3 style={{ margin: '15px 0', fontSize: '2.5rem', color: '#1E1B1C', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <button onClick={() => finalizarVentaLote('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer', fontSize: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>✅ COBRAR Y ENTREGAR</button>
                    <button onClick={() => finalizarVentaLote('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '20px', fontWeight: '900', cursor: 'pointer', fontSize: '16px', boxShadow: `0 10px 25px ${FUCSIA_PRINCIPAL}50` }}>📦 PAGADO - EN ALMACÉN</button>
                  </div>
                </div>
              )}

              {/* BUSCADOR DE CATÁLOGO */}
              <div style={{ marginBottom: '25px', position: 'relative' }}>
                <input placeholder="🔍 Buscar por nombre, marca o modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...estiloInput, paddingLeft: '60px', height: '65px', fontSize: '18px' }} />
                <span style={{ position: 'absolute', left: '22px', top: '18px', fontSize: '1.6rem' }}>🔍</span>
              </div>

              {/* GRILLA DE PRODUCTOS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px', maxHeight: '650px', overflowY: 'auto', padding: '10px' }}>
                {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  const stockCritico = p.stock < 5;

                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '22px', borderRadius: '32px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.04)', transition: '0.3s' }}>
                      {tag && <span style={{ position:'absolute', top: '-14px', left: '18px', backgroundColor: tag.color, color: '#fff', fontSize: '10px', padding: '6px 14px', borderRadius: '15px', fontWeight: '900', zIndex: 10, boxShadow: '0 5px 10px rgba(0,0,0,0.1)' }}>{tag.tipo} {tag.icono}</span>}
                      
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px', lineHeight: '1.3', color: '#1E1B1C', marginBottom: '12px' }}>{p.nombre}</strong>
                      
                      <div style={{ margin: '15px 0', padding: '10px', backgroundColor: stockCritico ? '#FFF1F2' : '#F0FDF4', borderRadius: '15px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: stockCritico ? '#E11D48' : '#16A34A' }}>EN STOCK: {p.stock}</span>
                      </div>

                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...estiloInput, padding: '10px', fontSize: '14px', marginBottom: '18px', border: '1px solid #E2E8F0', height: '45px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '20px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: '2px solid #E2E8F0', background: '#fff', borderRadius: '15px', width: '45px', height: '45px', cursor: 'pointer', fontWeight: '900', fontSize: '20px' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '20px', minWidth: '25px', textAlign: 'center' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: '2px solid #E2E8F0', background: '#fff', borderRadius: '15px', width: '45px', height: '45px', cursor: 'pointer', fontWeight: '900', fontSize: '20px' }}>+</button>
                      </div>

                      <button onClick={() => agregarAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '14px', fontWeight: '900', cursor:'pointer', transition: '0.2s' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(pAMostrar).toFixed(2)}` : 'SIN STOCK'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL DETALLADO CON EDICIÓN */}
            <div style={estiloCard}>
              <h4 style={{ margin: 0, marginBottom: '30px', color: '#64748B', fontSize: '14px', letterSpacing: '1.5px', fontWeight: '900', textTransform: 'uppercase' }}>Historial de Ventas Seleccionadas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.length === 0 ? <p style={{textAlign:'center', opacity:0.5, padding: '40px'}}>No hay registros para la fecha indicada.</p> : historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '32px', border: `1px solid #FCC2E2`, boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                    
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', backgroundColor: '#fff', padding: '20px', borderRadius: '22px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                         <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginLeft: '5px' }}>NOMBRE DEL CLIENTE:</label>
                            <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={estiloInput} />
                         </div>
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px' }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginLeft: '5px' }}>UBICACIÓN/ZONA:</label>
                                <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={estiloInput} />
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '900', color: FUCSIA_PRINCIPAL, marginLeft: '5px' }}>WHATSAPP:</label>
                                <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={estiloInput} />
                            </div>
                         </div>
                         <div style={{ display:'flex', gap:'12px', marginTop:'10px' }}>
                            <button onClick={() => guardarCambiosCliente(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', border:'none', padding:'18px', borderRadius:'15px', flex:2, fontWeight:'900', cursor:'pointer' }}>GUARDAR CAMBIOS</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', border:'none', padding:'18px', borderRadius:'15px', flex:1, fontWeight:'900', cursor:'pointer' }}>CANCELAR</button>
                         </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                          <strong style={{ color: FUCSIA_PRINCIPAL, fontSize: '22px', fontWeight: '900' }}>{grupo.cliente_nombre}</strong>
                          <br/><small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '12px', marginTop: '5px', display: 'block' }}>📍 {grupo.localidad} | 📱 {grupo.telefono}</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '10px 22px', borderRadius: '16px', fontWeight: '900', fontSize: '18px', boxShadow: '0 5px 15px rgba(22, 163, 74, 0.2)' }}>S/ {grupo.total.toFixed(2)}</div>
                           {/* BOTÓN WHATSAPP RESTAURADO ✅ */}
                           <button onClick={() => enviarWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '15px', cursor:'pointer', fontWeight:'900', fontSize:'13px', display: 'flex', alignItems: 'center', gap: '5px' }}>TICKET 📱</button>
                           <button onClick={() => prepararEdicionCliente(grupo)} title="Editar datos del cliente" style={{ border:'none', background:'#fff', padding:'12px', borderRadius:'15px', cursor:'pointer', border:'2px solid #FCC2E2', fontSize: '1.3rem' }}>✏️</button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 3px 10px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '15px' }}>
                                <strong style={{ color: '#1E1B1C', fontSize: '17px' }}>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre || 'Producto'} 
                                <br/><small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase', fontSize: '11px' }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 EN ALMACÉN' : '✅ ENTREGADO'}</small>
                            </div>
                            <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '17px' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => anularItemVenta(v)} title="Anular este ítem" style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '22px' }}>🗑️</button>
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

        {/* ========================================================================================= */}
        {/* [PANTALLA 2] LOGÍSTICA (STOCK PAGADO EN ALMACÉN)                                          */}
        {/* ========================================================================================= */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ ...estiloCard, backgroundColor: '#1E1B1C', color: '#fff', padding: '50px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', letterSpacing: '-1px' }}>📦 Gestión de Entregas Pendientes</h2>
                <p style={{ opacity: 0.7, fontSize: '18px', marginTop: '10px' }}>Control de mercadería vendida que aún no ha sido retirada físicamente por los clientes.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '30px' }}>
                {pendientesAlmacen.length === 0 ? (
                    <div style={{textAlign:'center', padding:'120px', opacity:0.3, gridColumn: '1/-1'}}><h3>✅ ¡Felicidades! No hay mercadería pendiente en almacén.</h3></div>
                ) : pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...estiloCard, borderLeft: `14px solid ${FUCSIA_PRINCIPAL}`, transition: '0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontSize: '1.8rem', fontWeight: '900' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '15px', color: '#64748B', fontWeight:'900', margin: '8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>📍 {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Te saluda el equipo de *B J Importaciones Chiclayo*. Te recordamos que tienes un pedido pendiente por recoger. ✨📦 ¡Te esperamos!`;
                                window.open(`https://wa.me/51${grupo.telefono.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '14px 20px', borderRadius: '16px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 20px rgba(37, 211, 102, 0.4)' }}>AVISAR 📱</button>
                        </div>
                        
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '25px', padding: '25px', marginBottom: '30px', border: '1px solid #E2E8F0' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', padding: '12px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                                    <span><strong style={{ color: '#1E1B1C', fontSize:'18px' }}>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre || 'Producto'} <br/><small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL }}>COLOR: {it.color}</small></span>
                                    <strong style={{ alignSelf: 'center', fontSize: '18px', color: '#1E1B1C' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'25px', borderTop:'4px solid #E2E8F0', paddingTop: '20px'}}>
                                <small style={{ fontWeight:'900', color: '#64748B', textTransform:'uppercase', fontSize:'12px' }}>Total Pagado por el cliente: </small>
                                <strong style={{ color: '#16A34A', fontSize:'1.8rem', fontWeight: '900', display: 'block' }}>S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        
                        <button onClick={async () => { 
                            if(confirm(`¿Confirmas que entregaste físicamente todo el pedido a ${grupo.cliente}?`)) { 
                                for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); 
                                alert("✅ Pedido entregado y quitado de Logística."); 
                            } 
                        }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                            ✅ MARCAR TODO COMO ENTREGADO
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* [PANTALLA 3] GESTIÓN (ADMINISTRACIÓN TOTAL)                                              */}
        {/* ========================================================================================= */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* PANEL DE VALORIZACIÓN DE CAPITAL */}
            <div style={{ ...estiloCard, border: `4px solid ${FUCSIA_PRINCIPAL}`, position: 'relative' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '30px', fontSize: '1.8rem', fontWeight: '900' }}>💎 Valorización y Salud del Negocio</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '30px', borderRadius: '28px', border: '1px solid #E2E8F0' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1.5px' }}>Inversión en Mercadería</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.5rem', fontWeight: '900', color: '#1E1B1C' }}>S/ {statsInventario.costo.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>Dinero real invertido en stock físico.</p>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '30px', borderRadius: '28px', border: `1px solid ${FUCSIA_PRINCIPAL}50` }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1.5px' }}>Retorno Esperado (P. Mayor)</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.5rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>S/ {statsInventario.venta.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#F786C1', fontWeight: '500' }}>Venta total proyectada al por mayor.</p>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '30px', borderRadius: '28px', border: '1px solid #BBF7D0' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1.5px' }}>Utilidad Bruta Proyectada</small>
                        <h3 style={{ margin: '12px 0', fontSize: '2.5rem', fontWeight: '900', color: '#16A34A' }}>S/ {statsInventario.utilidad.toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#16A34A', fontWeight: '500' }}>Ganancia libre tras liquidar todo el stock.</p>
                    </div>
                </div>
                <div style={{ marginTop: '25px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: '#1E1B1C', color: '#fff', display: 'inline-block', padding: '12px 35px', borderRadius: '20px', fontWeight: '900', fontSize: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                       📦 TOTAL DE PIEZAS EN LOCAL: {statsInventario.totalUnidades} UNIDADES
                    </div>
                </div>
            </div>

            {/* BALANCE FINANCIERO GLOBAL */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '25px' }}>
              <div style={{ ...estiloCard, borderLeft: `10px solid ${FUCSIA_PRINCIPAL}`, padding: '20px 30px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '11px', textTransform: 'uppercase' }}>Egresos y Compras</small>
                <h4 style={{ fontSize: '1.8rem', margin: '8px 0', fontWeight: '900' }}>S/ {balanceGlobal.gastos.toFixed(2)}</h4>
              </div>
              <div style={{ ...estiloCard, borderLeft: '10px solid #16A34A', padding: '20px 30px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '11px', textTransform: 'uppercase' }}>Ingresos Adicionales</small>
                <h4 style={{ fontSize: '1.8rem', margin: '8px 0', fontWeight: '900' }}>S/ {balanceGlobal.ingresosExtras.toFixed(2)}</h4>
              </div>
              <div style={{ ...estiloCard, borderLeft: '10px solid #3B82F6', padding: '20px 30px' }}>
                <small style={{ fontWeight: '900', opacity: 0.6, fontSize: '11px', textTransform: 'uppercase' }}>Ganancia Neta Real</small>
                <h4 style={{ fontSize: '1.8rem', margin: '8px 0', fontWeight: '900' }}>S/ {balanceGlobal.gananciaReal.toFixed(2)}</h4>
              </div>
              <div style={{ ...estiloCard, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '20px 30px' }}>
                <small style={{ fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}>Efectivo Físico en Caja</small>
                <h4 style={{ fontSize: '1.8rem', margin: '8px 0', fontWeight: '900' }}>S/ {balanceGlobal.cajaEfectivo.toFixed(2)}</h4>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '40px' }}>
              
              {/* COLUMNA IZQUIERDA: FORMULARIOS DE REGISTRO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                
                {/* REGISTRAR MOVIMIENTO (GASTO/INGRESO) */}
                <div style={estiloCard}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize: '1.2rem' }}>💸 Registrar Movimiento de Caja</h4>
                  <form onSubmit={registrarGasto} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={estiloInput}>
                      <option value="Gasto Local">🏪 Gasto Local (Servicios, Alquiler)</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Compra de Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal (Dueño)</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional (Ventas fuera de sistema)</option>
                      <option value="Inversión Inicial">💵 Inversión Inicial (Capital Externo)</option>
                    </select>
                    <input placeholder="Descripción del movimiento..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={estiloInput} />
                    <input type="text" placeholder="Monto S/ (Ej: 50.80)" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={estiloInput} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '20px', borderRadius: '18px', fontWeight: '900', cursor:'pointer', fontSize: '15px', transition: '0.3s' }}>GUARDAR REGISTRO</button>
                  </form>
                </div>
                
                {/* CARGAR PRODUCTO NUEVO AL CATÁLOGO */}
                <div style={{ ...estiloCard, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize: '1.2rem' }}>🆕 Cargar Nuevo Modelo al Sistema</h4>
                  <form onSubmit={registrarNuevoProducto} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input placeholder="Nombre Completo del Producto" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={estiloInput} />
                    <input placeholder="Colores (Separados por comas: Negro, Blanco, Azul)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={estiloInput} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{fontSize:'11px', fontWeight:'900', color:'#64748B', marginLeft:'12px'}}>COSTO UNITARIO S/</label>
                            <input type="text" placeholder="Costo" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={estiloInput} />
                        </div>
                        <div>
                            <label style={{fontSize:'11px', fontWeight:'900', color:'#64748B', marginLeft:'12px'}}>STOCK INICIAL</label>
                            <input type="number" placeholder="Piezas" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={estiloInput} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{fontSize:'11px', fontWeight:'900', color:FUCSIA_PRINCIPAL, marginLeft:'12px'}}>P. MAYORISTA S/</label>
                            <input type="text" placeholder="Venta Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...estiloInput, border:'3px solid #F786C1'}} />
                        </div>
                        <div>
                            <label style={{fontSize:'11px', fontWeight:'900', color:'#1E1B1C', marginLeft:'12px'}}>P. MINORISTA S/</label>
                            <input type="text" placeholder="Venta Menor" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...estiloInput, border:'3px solid #1E1B1C'}} />
                        </div>
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '20px', fontWeight: '900', fontSize: '16px', marginTop: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>REGISTRAR PRODUCTO NUEVO</button>
                  </form>
                </div>
              </div>

              {/* COLUMNA DERECHA: EDICIÓN PROFUNDA Y GRÁFICOS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                
                {/* AJUSTE DE STOCK CON TARJETAS MODERNAS */}
                <div style={estiloCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '25px', fontWeight: '900', fontSize: '1.2rem' }}>🔧 Ajuste Rápido de Stock y Catálogo</h4>
                  <input placeholder="🔍 Escribe para buscar producto..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...estiloInput, padding: '15px', marginBottom: '25px', border: `2px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {productos.filter(p => p.nombre.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const tag = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '22px', border: '1px solid #f1f1f1', borderRadius: '25px', backgroundColor: '#fff', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                              <div style={{ flex:1 }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {tag && <span style={{ backgroundColor: tag.color, color:'#fff', fontWeight: '900', fontSize: '10px', padding: '4px 10px', borderRadius: '12px' }}>{tag.icono} {tag.tipo}</span>}
                                    <strong style={{ fontSize: '16px', color: '#1E1B1C' }}>{p.nombre}</strong>
                                 </div>
                                 <small style={{ color: '#64748B', fontWeight: '900', display: 'block', marginTop: '5px', textTransform: 'uppercase', fontSize: '10px' }}>Costo: S/ {p.precio_compra} | Mayor: S/ {p.precio_venta}</small>
                              </div>
                              <button onClick={() => borrarProductoTotal(p)} title="Borrar del sistema" style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '1.8rem', transition: '0.2s' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '20px', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748B' }}>UNIDADES EN TIENDA:</span>
                              <input 
                                type="number" 
                                value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} 
                                onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} 
                                style={{ width: '90px', padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '16px', fontWeight: '900', outline: 'none' }} 
                              />
                              <button onClick={() => sincronizarStock(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '15px', fontSize: '12px', fontWeight: '900', cursor:'pointer', flex: 1 }}>ACTUALIZAR</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* LIBRO DIARIO CON FORMULARIO DE EDICIÓN INLINE */}
                <div style={cardBJ}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize: '1.2rem' }}>📖 Libro Diario de Gastos / Ingresos</h4>
                  <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '3px solid #F1F5F9' }}>
                           <th style={{ padding: '12px 5px' }}>MOVIMIENTO</th>
                           <th style={{ padding: '12px 5px', textAlign: 'right' }}>MONTO</th>
                           <th style={{ padding: '12px 5px', textAlign: 'right' }}>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '20px', backgroundColor: '#FFF5F7', borderRadius: '25px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={{...estiloInput, padding:'10px'}}>
                                          <option value="Gasto Local">Gasto Local</option>
                                          <option value="Inversión (Mercadería)">Inversión (Mercadería)</option>
                                          <option value="Retiro Personal">Retiro Personal</option>
                                          <option value="Ingreso Adicional">Ingreso Adicional</option>
                                          <option value="Inversión Inicial">Inversión Inicial</option>
                                      </select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={{...estiloInput, padding:'10px'}} placeholder="Descripción" />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={{...estiloInput, padding:'10px'}} placeholder="Monto S/" />
                                      <div style={{display:'flex', gap:'12px', marginTop: '5px'}}>
                                          <button onClick={guardarEdicionGastoReal} style={{backgroundColor:'#16A34A', color:'#fff', padding:'15px', borderRadius:'15px', border:'none', cursor:'pointer', flex:2, fontWeight:'900'}}>GUARDAR</button>
                                          <button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'15px', borderRadius:'15px', border:'none', cursor:'pointer', flex:1, fontWeight:'900'}}>X</button>
                                      </div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '18px 5px' }}>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase', fontSize: '10px', letterSpacing: '0.5px'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize: '14px', color: '#1E1B1C' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '18px 5px', fontWeight: '900', fontSize: '16px', color: f.tipo.includes('Ingreso') ? '#16A34A' : '#1E1B1C' }}>
                                    S/ {Number(f.monto).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '18px 5px' }}>
                                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                      <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'#F1F5F9', border:'none', padding:'10px', borderRadius:'12px', cursor:'pointer', fontSize: '1.1rem'}}>✏️</button>
                                      <button onClick={async ()=> { if(confirm("¿Anular este registro del libro diario?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'#FFF1F2', border:'none', color: FUCSIA_PRINCIPAL, padding:'10px', borderRadius:'12px', cursor:'pointer', fontSize: '1.1rem'}}>🗑️</button>
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

                {/* GRÁFICO RECHARTS DE RETORNO DE INVERSIÓN */}
                <div style={estiloCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '25px', fontWeight: '900', fontSize: '1.2rem' }}>📈 Comparativa: Inversión vs Retorno</h4>
                  <div style={{ height: '320px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataGraficoRetorno} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="nombre" fontSize={12} fontWeight="900" axisLine={false} tickLine={false} dy={10} />
                        <YAxis fontSize={12} axisLine={false} tickLine={false} />
                        <Tooltip 
                            formatter={(val)=> `S/ ${val.toLocaleString()}`} 
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 15px 30px rgba(0,0,0,0.12)', fontWeight: '900' }} 
                        />
                        <Bar dataKey="valor" radius={[15, 15, 0, 0]} barSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '20px', padding: '20px', backgroundColor: '#F0FDF4', borderRadius: '22px', border: '1px solid #BBF7D0' }}>
                    <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Diferencia de Capital (Margen): </small>
                    <strong style={{ color: '#16A34A', fontSize: '1.4rem', display: 'block', fontWeight: '900' }}>+ S/ {statsInventario.utilidad.toLocaleString()}</strong>
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