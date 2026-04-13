"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] SEGURIDAD DE DATOS (HELPERS ANTI-CRASH)
  // ============================================================

  // Validador de fechas: Devuelve string YYYY-MM-DD siempre.
  const getFechaPeru = (dateInput) => {
    try {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        
        const opciones = { 
            timeZone: "America/Lima", 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(d);
        const anio = partes.find(p => p.type === 'year')?.value || "2026";
        const mes = partes.find(p => p.type === 'month')?.value || "01";
        const dia = partes.find(p => p.type === 'day')?.value || "01";
        return `${anio}-${mes}-${dia}`;
    } catch (e) { 
        return new Date().toISOString().split('T')[0]; 
    }
  };

  // Validador de horas: Formato 12h con AM/PM seguro.
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "--:--";
        return d.toLocaleTimeString('es-PE', { 
            timeZone: "America/Lima", 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    } catch (e) { 
        return "--:--"; 
    }
  };

  // Limpiador de montos: Convierte "15,50" en 15.50 de forma segura.
  const handleInputMonto = (valor) => {
    if (valor === undefined || valor === null) return "";
    const str = String(valor);
    let limpio = str.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // Etiquetador de novedades en el catálogo.
  const getEtiquetaProducto = (createdAt) => {
    if (!createdAt) return null;
    try {
        const creacion = new Date(createdAt);
        const hoy = new Date();
        const diferenciaDias = Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24));
        if (diferenciaDias <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
        if (diferenciaDias <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [BLOQUE 2] ALMACÉN DE ESTADOS (REACT STATE)
  // ============================================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados de búsqueda y navegación
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Estados del Formulario de Venta Activa
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Estados de Edición de Datos (Historial)
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // Estados de Edición de Gestión
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ============================================================
  // [BLOQUE 3] NÚCLEO DE DATOS (DB & REALTIME)
  // ============================================================

  useEffect(() => {
    const inicializarSistema = async () => {
        await cargarTodoDesdeNube();
        setCargando(false);
    };
    inicializarSistema();

    // Canales de Realtime para actualización automática
    const canalVentas = supabase.channel('real-v39-v').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodoDesdeNube()).subscribe();
    const canalProductos = supabase.channel('real-v39-p').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodoDesdeNube()).subscribe();
    const canalFinanzas = supabase.channel('real-v39-f').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodoDesdeNube()).subscribe();

    return () => {
      supabase.removeChannel(canalVentas);
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalFinanzas);
    };
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        
        if (p) setProductos(p);
        if (v) setVentas(v);
        if (f) setFinanzas(f);
    } catch (err) {
        console.error("BJ System: Error de conexión.", err);
    }
  };

  // ============================================================
  // [BLOQUE 4] INTELIGENCIA Y CÁLCULOS (MEMOS BLINDADOS)
  // ============================================================

  // --- LOGÍSTICA: BUSCA MERCADERÍA EN ALMACÉN ---
  const pendientesAlmacen = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const enAlmacen = ventas.filter(v => v && v.estado_pedido === 'En Almacén');
        const mapaLogistico = {};
        enAlmacen.forEach(v => {
            const idUnico = `${v.cliente_nombre || 'S/N'}-${v.localidad || 'S/Z'}`;
            if (!mapaLogistico[idUnico]) {
                mapaLogistico[idUnico] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], totalVenta: 0 };
            }
            mapaLogistico[idUnico].items.push(v);
            mapaLogistico[idUnico].totalVenta += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
        });
        return Object.values(mapaLogistico);
    } catch (e) { return []; }
  }, [ventas]);

  // --- HISTORIAL: AGRUPA VENTAS DEL DÍA ---
  const historialVentasHoy = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const filtradas = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const gruposHistorial = {};
        filtradas.forEach(v => {
            const hKey = (v.created_at || "").substring(0,16);
            const llave = `${v.cliente_nombre || 'SIN-NOMBRE'}-${v.localidad || 'SIN-ZONA'}-${hKey}`; 
            if (!gruposHistorial[llave]) {
                gruposHistorial[llave] = { id_grupo: llave, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            gruposHistorial[llave].items.push(v);
            gruposHistorial[llave].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
        });
        return Object.values(gruposHistorial).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // --- GESTIÓN: BALANCE FINANCIERO (EL CORAZÓN DEL SISTEMA) ---
  const balanceFinanciero = useMemo(() => {
    try {
        const fList = finanzas || [];
        const vList = ventas || [];
        const hoyStr = getFechaPeru();
        
        const ventasDeHoy = vList.filter(v => v && getFechaPeru(v.created_at) === hoyStr);
        
        const sumaEgresos = fList.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((a, b) => a + (Number(b.monto) || 0), 0);
        const sumaExtras = fList.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((a, b) => a + (Number(b.monto) || 0), 0);
        const brutoVentas = vList.reduce((a, b) => a + (Number(b.precio_venta_unitario || 0) * Number(b.cantidad || 0)), 0);
        const gananciaRealTotal = vList.reduce((a, b) => a + (Number(b.ganancia_total) || 0), 0);
        
        return { 
            cajaHoy: ventasDeHoy.reduce((a, b) => a + (Number(b.precio_venta_unitario || 0) * Number(b.cantidad || 0)), 0),
            ganHoy: ventasDeHoy.reduce((a, b) => a + (Number(b.ganancia_total) || 0), 0),
            efectivoCaja: (brutoVentas + sumaExtras - sumaEgresos),
            egresosTotal: sumaEgresos, ingresosExtras: sumaExtras, gananciaNeta: gananciaRealTotal
        };
    } catch (e) { 
        return { cajaHoy: 0, ganHoy: 0, efectivoCaja: 0, egresosTotal: 0, ingresosExtras: 0, gananciaNeta: 0 }; 
    }
  }, [finanzas, ventas]);

  // --- GESTIÓN: AUDITORÍA DE INVENTARIO ---
  const auditoriaCapital = useMemo(() => {
    try {
        let costoTotal = 0; let ventaTotal = 0; let unidadesTotal = 0;
        (productos || []).forEach(p => { 
            const stk = Number(p.stock || 0);
            if (stk > 0) { 
                costoTotal += (Number(p.precio_compra || 0) * stk); 
                ventaTotal += (Number(p.precio_venta || 0) * stk); 
                unidadesTotal += stk; 
            } 
        });
        return { costoTotal, ventaTotal, unidadesTotal, utilidadEstimada: ventaTotal - costoTotal };
    } catch (e) { return { costoTotal: 0, ventaTotal: 0, unidadesTotal: 0, utilidadEstimada: 0 }; }
  }, [productos]);

  const chartROI = [
    { n: 'Inversión', v: auditoriaCapital.costoTotal || 0, fill: '#1E1B1C' },
    { n: 'Venta', v: auditoriaCapital.ventaTotal || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [BLOQUE 5] ACCIONES Y FUNCIONES (HANDLERS)
  // ============================================================

  // --- LÓGICA DE VENTAS ---
  const handleSeleccionarCliente = (e) => {
    const val = e.target.value; setCliente(val);
    const coincidencias = (ventas || []).find(v => v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (coincidencias) { setLocalidad(coincidencias.localidad || ''); setTelefono(coincidencias.telefono || ''); }
  };

  const agregarProductoAlCarrito = (p) => {
    const c = Number(cantidades[p.id] || 1);
    const pb = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const yaEnCarrito = carrito.filter(i => i.producto_id === p.id).reduce((a, b) => a + b.cantidad, 0);
    
    if ((Number(p.stock) || 0) < c + yaEnCarrito) return alert("¡Atención! No hay stock suficiente para esta cantidad.");
    
    setCarrito([...carrito, { 
        producto_id: p.id, 
        nombre: p.nombre, 
        cantidad: c, 
        color: (coloresElegidos[p.id] || "Único"), 
        precio_venta: pb, 
        precio_compra: p.precio_compra 
    }]);
  };

  const enviarWhatsAppDeVenta = (grupo) => {
    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de compra de *B J Importaciones Chiclayo*.%0A%0A`;
    grupo.items.forEach(v => {
        const prodMatch = productos.find(p => p.id === v.producto_id);
        msg += `- *${v.cantidad}x* ${prodMatch?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    msg += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Gracias por tu compra! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const finalizarVentaDelCarrito = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Error: Faltan datos del cliente (Nombre o Zona).");
    if (carrito.length === 0) return alert("El carrito está vacío.");

    const tVentaTotal = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const factorDescuento = tVentaTotal > 0 ? (Number(descuento) / tVentaTotal) : 0;

    const listaVentas = carrito.map(i => {
        const pVentaIndividual = Number(i.precio_venta);
        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pVentaIndividual, 
            precio_costo_unitario: Number(i.precio_compra || 0), 
            ganancia_total: ((pVentaIndividual - Number(i.precio_compra || 0)) * i.cantidad) - ((pVentaIndividual * i.cantidad) * factorDescuento), 
            estado_pedido: estado 
        };
    });

    const { error } = await supabase.from('ventas').insert(listaVentas);
    if (!error) {
      for (const item of carrito) {
        const prodOrigin = productos.find(p => p.id === item.producto_id);
        if (prodOrigin) await supabase.from('productos').update({ stock: prodOrigin.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta procesada correctamente.");
    }
  };

  // --- LÓGICA DE EDICIONES ---
  const handleCorregirCantidadHistorial = async (v) => {
    const diff = nuevaCantVenta - v.cantidad;
    const pRef = productos.find(p => p.id === v.producto_id);
    if (pRef && pRef.stock < diff) return alert("Error: No hay stock suficiente para aumentar esta venta.");
    
    const { error } = await supabase.from('ventas').update({ 
        cantidad: nuevaCantVenta, 
        ganancia_total: (v.precio_venta_unitario - v.precio_costo_unitario) * nuevaCantVenta 
    }).eq('id', v.id);

    if (!error) {
        if (pRef) await supabase.from('productos').update({ stock: (pRef.stock - diff) }).eq('id', pRef.id);
        setIdItemVentaEditando(null);
        alert("✅ Cantidad corregida.");
    }
  };

  const handleAnularVenta = async (v) => {
    if (confirm("¿Seguro que quieres anular este producto? El stock se devolverá al catálogo.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  const handleGuardarCambiosCliente = async (grupo) => {
    for (const item of grupo.items) {
      await supabase.from('ventas').update({
        cliente_nombre: formEditCliente.nombre, localidad: formEditCliente.localidad, telefono: formEditCliente.telefono
      }).eq('id', item.id);
    }
    setEditandoGrupoId(null);
    alert("✅ Datos del cliente actualizados.");
  };

  // --- LÓGICA DE GESTIÓN ---
  const handleCrearProducto = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre,
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)),
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock),
        colores: formProd.colores
    }]);
    if (!error) {
        setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
        alert("✨ Producto agregado exitosamente.");
    }
  };

  const handleRegistrarGastoManual = async (e) => {
    e.preventDefault();
    const montoLimpio = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(montoLimpio)}]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''});
    alert("✅ Registro de finanzas guardado.");
  };

  const handleUpdateGastoLibro = async () => {
    const ml = handleInputMonto(String(formEditFinanza.monto));
    await supabase.from('finanzas').update({ 
        tipo: formEditFinanza.tipo, 
        descripcion: formEditFinanza.descripcion, 
        monto: Number(ml) 
    }).eq('id', idFinanzaEditando);
    setIdFinanzaEditando(null);
  };

  const exportarExcelCajaCompleta = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Cant,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const np = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${np},${v.cantidad},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `BJ_Caja_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ============================================================
  // [BLOQUE 6] DISEÑO Y RENDERIZADO (VISUAL UI)
  // ============================================================

  const bjInput = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const bjCard = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', fontWeight:'bold', color:FUCSIA_PRINCIPAL, fontSize:'1.5rem' }}>INICIANDO BJ DASHBOARD MAESTRO... 🚀✨</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🚀 NAVBAR GLOBAL */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 10px rgba(0,0,0,0.05)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase' }}>CHICLAYO • MAESTRO v39</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ===================== [PESTAÑA: VENTAS] ===================== */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            {/* BOXES DE DINERO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={bjCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA HOY</span>
                  <button onClick={exportarExcelCajaCompleta} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '10px 18px', borderRadius: '12px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '10px' }}>RESPALDO EXCEL</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceFinanciero.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '15px', backgroundColor: '#F0FDF4', padding: '10px 20px', borderRadius: '15px', display: 'inline-block' }}>Ganancia: S/ {balanceFinanciero.ganHoy.toFixed(2)}</div>
              </div>
              <div style={bjCard}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR HISTORIAL</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...bjInput, marginTop: '15px' }} />
              </div>
            </div>

            {/* FORMULARIO DE REGISTRO */}
            <div style={{ ...bjCard, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="cl_datalist" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleSeleccionarCliente} style={bjInput} />
                <datalist id="cl_datalist">{(ventas || []).map((v, i) => <option key={i} value={v.cliente_nombre} />)}</datalist>
                <input placeholder="📱 WhatsApp (Celular)" value={telefono} onChange={e => setTelefono(e.target.value)} style={bjInput} />
                <input placeholder="📍 Zona / Distrito / Pueblo" value={localidad} onChange={e => setLocalidad(e.target.value)} style={bjInput} />
              </div>

              {/* CARRITO INTERACTIVO */}
              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `3px dashed ${FUCSIA_PRINCIPAL}`, borderRadius: '25px', padding: '30px', marginBottom: '40px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FCC2E2', paddingBottom: '15px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>{item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#fff', padding: '6px 12px', borderRadius: '12px', border: '2px solid #FCA5D4' }}>
                           <span style={{ fontSize: '14px', fontWeight: '900' }}>S/</span>
                           <input type="text" value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '80px', border: 'none', outline: 'none', textAlign: 'center', fontSize: '17px', fontWeight: '900' }} />
                        </div>
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_PRINCIPAL, border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '30px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO GLOBAL: S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900', fontSize:'20px' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '20px' }}>
                    <button onClick={() => finalizarVentaDelCarrito('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px' }}>✅ PAGAR Y ENTREGAR</button>
                    <button onClick={() => finalizarVentaDelCarrito('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px' }}>📦 GUARDAR ALMACÉN</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...bjInput, marginBottom: '25px', height: '65px', fontSize: '18px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '700px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '25px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tag && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tag.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tag.tipo} {tag.icono}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px', color: '#1E1B1C' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: (p.stock < 5) ? '#FFF1F2' : '#F0FDF4', borderRadius: '18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: (p.stock < 5) ? '#E11D48' : '#16A34A' }}>EN LOCAL: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...bjInput, padding: '10px', fontSize: '14px', marginBottom: '20px', height: '50px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '22px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '48px', height: '48px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => agregarProductoAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `AÑADIR S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL DETALLADO */}
            <div style={bjCard}>
              <h4 style={{ margin: 0, marginBottom: '35px', color: '#64748B', fontSize: '15px', fontWeight: '900', textTransform:'uppercase' }}>📜 Ventas Realizadas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `1px solid #FCC2E2` }}>
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', backgroundColor:'#fff', padding:'25px', borderRadius:'25px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={bjInput} />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                            <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={bjInput} />
                            <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={bjInput} />
                         </div>
                         <div style={{ display:'flex', gap:'15px', marginTop:'10px' }}>
                            <button onClick={() => handleGuardarCambiosCliente(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', padding:'18px', borderRadius:'15px', flex:2, fontWeight:'900' }}>GUARDAR CAMBIOS</button>
                            <button onClick={() => setEditandoGrupoId(null)} style={{ backgroundColor:'#64748B', color:'#fff', padding:'18px', borderRadius:'15px', fontWeight:'900' }}>X</button>
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
                           <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: '10px 22px', borderRadius: '16px', fontWeight: '900', fontSize: '18px' }}>S/ {grupo.total.toFixed(2)}</div>
                           <button onClick={() => enviarWhatsAppDeVenta(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '15px', cursor:'pointer', fontWeight:'900', fontSize:'13px' }}>TICKET 📱</button>
                           <button onClick={() => prepararEdicion(grupo)} style={{ border:'none', background:'#fff', padding:'12px', borderRadius:'18px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {grupo.items.map(v => (
                        <div key={v.id} style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 5px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '16px' }}>
                                {idItemVentaEditando === v.id ? (
                                    <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                                        <input type="number" value={nuevaCantVenta} onChange={e=>setNuevaCantVenta(Number(e.target.value))} style={{ width:'80px', padding:'10px', borderRadius:'12px', border:'2px solid #FCA5D4', fontWeight:'900' }} />
                                        <button onClick={() => handleCorregirCantidadHistorial(v)} style={{ background:'#16A34A', color:'#fff', padding:'10px 20px', borderRadius:'12px', fontWeight:'900' }}>OK</button>
                                        <button onClick={() => setIdItemVentaEditando(null)} style={{ background:'#64748B', color:'#fff', padding:'10px 20px', borderRadius:'12px', fontWeight:'900' }}>X</button>
                                    </div>
                                ) : (
                                    <>
                                        <strong>{v.cantidad}x</strong> {productos.find(p => p.id === v.producto_id)?.nombre || 'Modelo cargado'}<br/>
                                        <small style={{ fontWeight:'900', color: FUCSIA_PRINCIPAL }}>{v.color} | {v.estado_pedido==='En Almacén' ? '📦 ALMACÉN' : '✅ OK'}</small>
                                        <button onClick={() => { setIdItemVentaEditando(v.id); setNuevaCantVenta(v.cantidad); }} style={{ background:'none', border:'none', color:'#64748B', fontSize:'12px', textDecoration:'underline', cursor:'pointer', marginLeft:'15px', fontWeight:'bold' }}>Cambiar Cantidad</button>
                                    </>
                                )}
                            </div>
                            <div style={{ display:'flex', gap:'25px', alignItems:'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '20px' }}>S/ {(v.precio_venta_unitario * v.cantidad).toFixed(2)}</span>
                                <button onClick={() => handleAnularVenta(v)} style={{ border:'none', background:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '26px' }}>🗑️</button>
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

        {/* ===================== [PESTAÑA: LOGÍSTICA] ===================== */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...bjCard, backgroundColor: '#1E1B1C', color: '#fff', padding: '60px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: '900' }}>📦 Entregas Pendientes Globales</h2>
                <p style={{ opacity: 0.7, fontSize: '20px', marginTop:'15px' }}>Toda la mercadería pagada que aún no ha sido retirada físicamente.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                {pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...bjCard, borderLeft: `15px solid ${FUCSIA_PRINCIPAL}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'2rem' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '16px', color: '#64748B', fontWeight:'900', margin: '8px 0' }}>📍 ZONA: {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido en B J Importaciones Chiclayo ya está listo para retirar. ✨📦`;
                                window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '16px 25px', borderRadius: '18px', fontWeight:'900' }}>AVISAR 📱</button>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '30px', padding: '30px', marginBottom: '30px' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', padding: '10px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                                    <span><strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre || 'Producto'}</span>
                                    <strong style={{ fontSize:'18px' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'30px', borderTop:'5px solid #E2E8F0', paddingTop: '22px'}}>
                                <strong style={{ color: '#16A34A', fontSize:'2.2rem', fontWeight: '900' }}>TOTAL: S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        <button onClick={async () => { if(confirm(`¿Entrega completa a ${grupo.cliente}?`)) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); alert("✅ ¡Entregado!"); } }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '25px', borderRadius: '25px', fontWeight: '900', fontSize: '18px' }}>✅ MARCAR TODO ENTREGADO</button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ===================== [PESTAÑA: GESTIÓN] ===================== */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ ...bjCard, border: `4px solid ${FUCSIA_PRINCIPAL}` }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize:'2rem' }}>📊 Auditoría de Capital y Salud BJ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '35px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>DINERO EN STOCK (COSTO)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem' }}>S/ {(auditoriaCapital.costoTotal ?? 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase' }}>RETORNO ESTIMADO (VENTA)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem', color: FUCSIA_PRINCIPAL }}>S/ {(auditoriaCapital.ventaTotal ?? 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase' }}>UTILIDAD AL LIQUIDAR</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem', color: '#16A34A' }}>S/ {(auditoriaCapital.utilidadEstimada ?? 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px' }}>
              <div style={{ ...bjCard, borderLeft: `10px solid ${FUCSIA_PRINCIPAL}`, padding: '25px' }}><small style={{fontWeight:'900', opacity:0.6}}>EGRESOS TOTALES</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceFinanciero.egresosTotal ?? 0).toFixed(2)}</h4></div>
              <div style={{ ...bjCard, borderLeft: '10px solid #16A34A', padding: '25px' }}><small style={{fontWeight:'900', opacity:0.6}}>INGRESOS EXTRAS</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceFinanciero.ingresosExtras ?? 0).toFixed(2)}</h4></div>
              <div style={{ ...bjCard, borderLeft: '10px solid #3B82F6', padding: '25px' }}><small style={{fontWeight:'900', opacity:0.6}}>GANANCIA TOTAL</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceFinanciero.gananciaNeta ?? 0).toFixed(2)}</h4></div>
              <div style={{ ...bjCard, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '25px' }}><small style={{fontWeight:'900'}}>EFECTIVO EN CAJA</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {(balanceFinanciero.efectivoCaja ?? 0).toFixed(2)}</h4></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Movimiento de Caja</h4>
                  <form onSubmit={handleRegistrarGastoManual} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={bjInput}>
                      <option value="Gasto Local">🏪 Gasto Local</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                    </select>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={bjInput} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={bjInput} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR</button>
                  </form>
                </div>
                <div style={{ ...bjCard, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Subir Nuevo Producto</h4>
                  <form onSubmit={handleCrearProducto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={bjInput} />
                    <input placeholder="Colores (comas: Rojo, Azul, Negro)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={bjInput} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={bjInput} />
                        <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={bjInput} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="P. MAYOR" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...bjInput, border:'3px solid #F786C1'}} />
                        <input type="text" placeholder="P. MINOR" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...bjInput, border:'3px solid #1E1B1C'}} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🔧 Ajuste Rápido de Stock</h4>
                  <input placeholder="🔍 Buscar modelo..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...bjInput, padding: '15px', marginBottom: '25px', border: `3px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {productos.filter(p => p.nombre?.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => {
                        const t = getEtiquetaProducto(p.created_at);
                        return (
                          <div key={p.id} style={{ padding: '22px', border: '1px solid #f1f1f1', borderRadius: '30px', backgroundColor: '#fff', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                              <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                {t && <span style={{backgroundColor: t.color, color:'#fff', fontWeight: '900', fontSize: '9px', padding: '3px 8px', borderRadius: '10px'}}>{t.icono} {t.tipo}</span>}
                                <strong style={{fontSize:'18px'}}>{p.nombre}</strong>
                              </div>
                              <button onClick={async () => { if(confirm("Borrar?")) await supabase.from('productos').delete().eq('id', p.id); }} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '2rem' }}>🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '22px', alignItems: 'center' }}>
                              <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '90px', padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                              <button onClick={() => editStockCat(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', flex: 1, cursor:'pointer' }}>GUARDAR</button>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>

                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Detallado</h4>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '30px', border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={bjInput}><option value="Gasto Local">Gasto Local</option><option value="Inversión (Mercadería)">Inversión (Mercadería)</option><option value="Retiro Personal">Retiro Personal</option><option value="Ingreso Adicional">Ingreso Adicional</option></select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={bjInput} />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={bjInput} />
                                      <div style={{display:'flex', gap:'15px', marginTop: '10px'}}><button onClick={handleUpdateGastoLibro} style={{backgroundColor:'#16A34A', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:2, fontWeight:'900' }}>OK</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:1}}>X</button></div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '22px 10px' }}>
                                    <small style={{fontWeight:'900', color:'#64748B', display:'block'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize: '16px' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '22px 10px', fontWeight: '900', fontSize: '18px', color: (f.tipo?.includes('Ingreso')) ? '#16A34A' : '#1E1B1C' }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '22px 10px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.4rem', marginRight:'12px'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("¿Borrar?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.4rem'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={bjCard}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno</h4>
                  <div style={{ height: '350px', width: '100%' }}>
                    {(auditoriaCapital.costoTotal > 0) && (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartROI} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="n" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="v" radius={[20, 20, 0, 0]} barSize={80} />
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