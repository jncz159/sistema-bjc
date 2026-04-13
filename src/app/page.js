"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [SECCIÓN 1] HELPERS (UTILIDADES DE FORMATO Y SEGURIDAD)
  // ============================================================

  // Convierte cualquier entrada en una fecha válida de Chiclayo
  const getFechaPeru = (dateInput) => {
    try {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        const opciones = { timeZone: "America/Lima", year: 'numeric', month: '2-digit', day: '2-digit' };
        const partes = new Intl.DateTimeFormat('en-CA', opciones).formatToParts(d);
        const anio = partes.find(p => p.type === 'year')?.value || "2026";
        const mes = partes.find(p => p.type === 'month')?.value || "01";
        const dia = partes.find(p => p.type === 'day')?.value || "01";
        return `${anio}-${mes}-${dia}`;
    } catch (e) { return new Date().toISOString().split('T')[0]; }
  };

  // Obtiene la hora en formato 12h (AM/PM) para el historial y libro diario
  const getHoraPeru = (dateInput) => {
    if (!dateInput) return "--:--";
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "--:--";
        return d.toLocaleTimeString('es-PE', { 
            timeZone: "America/Lima", hour: '2-digit', minute: '2-digit', hour12: true 
        });
    } catch (e) { return "--:--"; }
  };

  // Limpia comas y asegura que el monto sea un número procesable
  const handleInputMonto = (valor) => {
    if (typeof valor !== 'string') return String(valor || '');
    let limpio = valor.replace(',', '.');
    return limpio.replace(/[^0-9.]/g, '');
  };

  // Genera etiquetas automáticas para productos nuevos
  const getEtiquetaProducto = (createdAt) => {
    if (!createdAt) return null;
    try {
        const creacion = new Date(createdAt);
        const hoy = new Date();
        const diff = Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F786C1' };
        if (diff <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [SECCIÓN 2] ESTADOS DEL SISTEMA (MEMORIA)
  // ============================================================

  const [vista, setVista] = useState('ventas'); 
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Buscadores y Filtros de fecha
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Datos de la venta que se está armando
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Estados para edición de ventas pasadas
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // Estados para edición de finanzas y stock
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_PRINCIPAL = '#F786C1';

  // ============================================================
  // [SECCIÓN 3] DB & REALTIME (CONEXIÓN SUPABASE)
  // ============================================================

  useEffect(() => {
    const inicializar = async () => {
        await cargarTodo();
        setCargando(false);
    };
    inicializar();

    // Canales de tiempo real para que todo se actualice solo
    const canalV = supabase.channel('v-upd').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodo()).subscribe();
    const canalP = supabase.channel('p-upd').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodo()).subscribe();
    const canalF = supabase.channel('f-upd').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodo()).subscribe();

    return () => {
      supabase.removeChannel(canalV);
      supabase.removeChannel(canalP);
      supabase.removeChannel(canalF);
    };
  }, []);

  const cargarTodo = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p);
        if (v) setVentas(v);
        if (f) setFinanzas(f);
    } catch (err) { console.error("Error en sincronización:", err); }
  };

  // ============================================================
  // [SECCIÓN 4] CÁLCULOS PROCESADOS (USEMEMO - BLINDADOS)
  // ============================================================

  // Agrupación de mercadería pagada en almacén
  const pendientesAlmacen = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const pend = ventas.filter(v => v.estado_pedido === 'En Almacén');
        const g = {};
        pend.forEach(v => {
            const k = `${v.cliente_nombre || 'S/N'}-${v.localidad || 'S/Z'}`;
            if (!g[k]) {
                g[k] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], totalVenta: 0 };
            }
            g[k].items.push(v);
            g[k].totalVenta += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(g);
    } catch (e) { return []; }
  }, [ventas]);

  // Historial de ventas del día con horario
  const historialVentasHoy = useMemo(() => {
    if (!ventas || ventas.length === 0) return [];
    try {
        const filtradas = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta);
        const grupos = {};
        filtradas.forEach(v => {
            const hK = v.created_at ? v.created_at.substring(0,16) : "0000-00-00 00:00";
            const key = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hK}`; 
            if (!grupos[key]) {
                grupos[key] = { id_grupo: key, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            grupos[key].items.push(v);
            grupos[key].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(grupos).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // Balance financiero total (Lo que hace que GESTIÓN no falle)
  const balanceGeneral = useMemo(() => {
    try {
        const fList = finanzas || [];
        const vList = ventas || [];
        const hoy = getFechaPeru();
        const vHoy = vList.filter(v => getFechaPeru(v.created_at) === hoy);

        const eg = fList.filter(f => ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const ex = fList.filter(f => ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const vB = vList.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0);
        const gN = vList.reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);
        
        return { 
            cajaHoy: vHoy.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            ganHoy: vHoy.reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0),
            efectivoCaja: (vB + ex - eg),
            egresosTotal: eg, ingresosExtras: ex, gananciaAcumulada: gN
        };
    } catch (e) { return { cajaHoy: 0, ganHoy: 0, efectivoCaja: 0, egresosTotal: 0, ingresosExtras: 0, gananciaAcumulada: 0 }; }
  }, [finanzas, ventas]);

  // Auditoría de Inventario (Blindaje de Capital)
  const auditoriaInventario = useMemo(() => {
    try {
        let c = 0; let v = 0; let u = 0;
        (productos || []).forEach(p => { 
            const st = Number(p.stock ?? 0);
            if (st > 0) { 
                c += (Number(p.precio_compra ?? 0) * st); 
                v += (Number(p.precio_venta ?? 0) * st); 
                u += st; 
            } 
        });
        return { costo: c, venta: v, unid: u, util: v - c };
    } catch (e) { return { costo: 0, venta: 0, unid: 0, util: 0 }; }
  }, [productos]);

  const chartData = [
    { name: 'Inversión', val: auditoriaInventario.costo || 0, fill: '#1E1B1C' },
    { name: 'Retorno', val: auditoriaInventario.venta || 0, fill: FUCSIA_PRINCIPAL }
  ];

  // ============================================================
  // [SECCIÓN 5] FUNCIONES DE ACCIÓN (HANDLERS)
  // ============================================================

  // Agrega un producto al carrito verificando stock
  const addAlCarrito = (p) => {
    const c = Number(cantidades[p.id] || 1);
    const pb = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
    const ya = carrito.filter(i => i.producto_id === p.id).reduce((acc, i) => acc + i.cantidad, 0);
    
    if ((Number(p.stock) || 0) < c + ya) return alert("¡No hay suficiente stock físico!");
    
    setCarrito([...carrito, { 
        producto_id: p.id, 
        nombre: p.nombre, 
        cantidad: c, 
        color: (coloresElegidos[p.id] || "Único"), 
        precio_venta: pb, 
        precio_compra: p.precio_compra 
    }]);
  };

  // Envía ticket profesional por WhatsApp
  const enviarWhatsAppVenta = (grupo) => {
    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo de compra de *B J Importaciones Chiclayo*.%0A%0A`;
    grupo.items.forEach(v => {
        const prod = productos.find(p => p.id === v.producto_id);
        msg += `- *${v.cantidad}x* ${prod?.nombre || 'Ítem'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    msg += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias por tu preferencia! 😊✨`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  // Finaliza la venta y descuenta stock
  const completarVenta = async (estado = 'Entregado') => {
    if (!cliente || !localidad) return alert("Por favor ingresa Cliente y Zona.");
    if (carrito.length === 0) return alert("El carrito está vacío.");

    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const ratioD = totalV > 0 ? (Number(descuento) / totalV) : 0;

    const items = carrito.map(i => {
        const pv = Number(i.precio_venta);
        return { 
            cliente_nombre: cliente, localidad, telefono: telefono || '', producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: pv, 
            precio_costo_unitario: Number(i.precio_compra ?? 0), 
            ganancia_total: ((pv - Number(i.precio_compra ?? 0)) * i.cantidad) - ((pv * i.cantidad) * ratioD), 
            estado_pedido: estado 
        };
    });

    const { error } = await supabase.from('ventas').insert(items);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0);
      alert("✅ Venta realizada.");
    }
  };

  // Corregir cantidad de una venta ya hecha (con ajuste de stock)
  const corregirCantidadHistorial = async (v) => {
    const diff = nuevaCantVenta - v.cantidad;
    const pRef = productos.find(p => p.id === v.producto_id);
    if (pRef && pRef.stock < diff) return alert("No hay stock suficiente para aumentar la venta.");
    
    const { error } = await supabase.from('ventas').update({ 
        cantidad: nuevaCantVenta, 
        ganancia_total: (v.precio_venta_unitario - v.precio_costo_unitario) * nuevaCantVenta 
    }).eq('id', v.id);

    if (!error) {
        if (pRef) await supabase.from('productos').update({ stock: (pRef.stock - diff) }).eq('id', pRef.id);
        setIdItemVentaEditando(null);
        alert("✅ Cantidad actualizada.");
    }
  };

  // Anular un ítem de venta del historial
  const anularItemVenta = async (v) => {
    if (confirm("¿Estás seguro de anular este ítem? El stock se devolverá al catálogo.")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // Guardar cambios de nombre/zona de un cliente en el historial
  const guardarCambiosCli = async (grupo) => {
    for (const item of grupo.items) {
      await supabase.from('ventas').update({
        cliente_nombre: formEditCliente.nombre, localidad: formEditCliente.localidad, telefono: formEditCliente.telefono
      }).eq('id', item.id);
    }
    setEditandoGrupoId(null);
    alert("✅ Datos actualizados.");
  };

  // Crear nuevo producto en el catálogo
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
    if (!error) {
        setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
        alert("✨ Modelo creado exitosamente.");
    }
  };

  // Registrar un gasto o ingreso manual en el libro diario
  const registrarGastoManual = async (e) => {
    e.preventDefault();
    const cleanM = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{...formFinanzas, monto: Number(cleanM)}]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:''});
    alert("✅ Registro guardado.");
  };

  // Exportación masiva a Excel de la caja del día
  const exportarExcelCaja = () => {
    let csv = "data:text/csv;charset=utf-8,Fecha,Hora,Cliente,Zona,Producto,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const np = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getFechaPeru(v.created_at)},${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${np},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Cierre_BJ_${fechaConsulta}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // ============================================================
  // [SECCIÓN 6] RENDERIZADO DE INTERFAZ (DISEÑO VISUAL)
  // ============================================================

  const inpEstilo = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff', transition: '0.3s' };
  const crdEstilo = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.15)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', fontWeight:'bold', color:FUCSIA_PRINCIPAL, fontSize:'1.5rem' }}>INICIANDO BJ DASHBOARD... 💎🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: '#1E1B1C', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🟢 NAVBAR MAESTRO */}
      <header style={{ backgroundColor: '#ffffff', padding: '20px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)`, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.4rem' }}>BJ</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>B J IMPORTACIONES</h1>
            <small style={{ color: '#64748B', fontWeight: '900', fontSize: '10px', textTransform:'uppercase' }}>CHICLAYO • MAESTRO v37</small>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '6px', borderRadius: '18px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? '#1E1B1C' : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : '#1E1B1C', padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_PRINCIPAL : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 22px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', transition: '0.3s' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* ============================================================ */}
        {/* TAB 1: MÓDULO DE VENTAS                                      */}
        {/* ============================================================ */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={crdEstilo}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>💰 CAJA HOY</span>
                  <button onClick={exportarExcelCaja} style={{ backgroundColor: `#FCA5D430`, border: 'none', padding: '10px 18px', borderRadius: '12px', color: FUCSIA_PRINCIPAL, cursor: 'pointer', fontWeight: '900', fontSize: '10px' }}>EXCEL</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.5rem', fontWeight: '900' }}>S/ {balanceGeneral.cajaHoy.toFixed(2)}</h2>
                <div style={{ color: '#16A34A', fontWeight: '900', fontSize: '15px', backgroundColor: '#F0FDF4', padding: '10px 20px', borderRadius: '15px', display: 'inline-block' }}>Ganancia Día: S/ {balanceGeneral.ganHoy.toFixed(2)}</div>
              </div>
              <div style={crdEstilo}>
                <span style={{ color: FUCSIA_PRINCIPAL, fontWeight: '900', fontSize: '13px' }}>📅 BUSCAR POR FECHA</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...inpEstilo, marginTop: '15px' }} />
              </div>
            </div>

            {/* FORMULARIO DE PEDIDO */}
            <div style={{ ...crdEstilo, border: `3px solid #FCA5D4` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight: '900' }}>🛒 Registrar Nuevo Pedido</h3>
                <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '18px', padding: '6px' }}>
                  <button onClick={() => setTipoVenta('Mayor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Mayor' ? FUCSIA_PRINCIPAL : 'transparent', color: tipoVenta === 'Mayor' ? '#fff' : '#64748B' }}>MAYOR</button>
                  <button onClick={() => setTipoVenta('Menor')} style={{ border: 'none', padding: '10px 22px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '900', backgroundColor: tipoVenta === 'Menor' ? '#1E1B1C' : 'transparent', color: tipoVenta === 'Menor' ? '#fff' : '#64748B' }}>MINORISTA</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clients_list" placeholder="👤 Nombre Cliente" value={cliente} onChange={handleClienteChange} style={inpEstilo} />
                <datalist id="clients_list">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="📱 WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} style={inpEstilo} />
                <input placeholder="📍 Zona / Pueblo" value={localidad} onChange={e => setLocalidad(e.target.value)} style={inpEstilo} />
              </div>

              {/* CARRITO */}
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
                    <span style={{ fontSize: '14px', fontWeight: '900' }}>DSCTO S/ </span>
                    <input type="text" value={descuento} onChange={e=>setDescuento(handleInputMonto(e.target.value))} style={{ width: '130px', padding: '12px', borderRadius: '15px', border: `2px solid ${FUCSIA_PRINCIPAL}`, textAlign: 'center', fontWeight: '900' }} />
                    <h3 style={{ margin: '10px 0', fontSize: '2.8rem', fontWeight: '900' }}>TOTAL: S/ {(carrito.reduce((a, b) => a + (Number(b.precio_venta) * b.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginTop: '20px' }}>
                    <button onClick={() => completarVenta('Entregado')} style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px' }}>✅ ENTREGAR YA</button>
                    <button onClick={() => completarVenta('En Almacén')} style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', cursor: 'pointer', fontSize: '17px' }}>📦 GUARDAR ALMACÉN</button>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo para vender..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inpEstilo, marginBottom: '25px', height: '65px', fontSize: '18px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px', maxHeight: '700px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => {
                  const tag = getEtiquetaProducto(p.created_at);
                  const pAMostrar = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                  return (
                    <div key={p.id} style={{ border: '1px solid #FFF1F2', padding: '25px', borderRadius: '35px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                      {tag && <span style={{ position:'absolute', top: '-15px', left: '20px', backgroundColor: tag.color, color: '#fff', fontSize: '10px', padding: '6px 15px', borderRadius: '15px', fontWeight: '900', zIndex: 10 }}>{tag.tipo} {tag.icono}</span>}
                      <strong style={{ display: 'block', height: '45px', overflow: 'hidden', fontSize: '16px', color: '#1E1B1C' }}>{p.nombre}</strong>
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: p.stock < 5 ? '#FFF1F2' : '#F0FDF4', borderRadius: '15px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: p.stock < 5 ? '#E11D48' : '#16A34A' }}>STOCK: {p.stock}</span>
                      </div>
                      <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...inpEstilo, padding: '8px', fontSize: '13px', marginBottom: '15px', height: '45px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginBottom: '20px', alignItems: 'center' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '45px', height: '45px', cursor:'pointer' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '22px', paddingTop:'8px' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.min(p.stock, (cantidades[p.id] || 1) + 1)})} style={{ border: 'none', background: '#f5f5f5', borderRadius: '12px', width: '45px', height: '45px', cursor:'pointer' }}>+</button>
                      </div>
                      <button onClick={() => addAlCarrito(p)} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: tipoVenta === 'Mayor' ? '#1E1B1C' : '#A13C6D', color: '#fff', border: 'none', padding: '18px', borderRadius: '22px', fontSize: '14px', fontWeight: '900', cursor:'pointer' }}>
                        {p.stock > 0 ? `VENDER S/ ${Number(pAMostrar).toFixed(2)}` : 'AGOTADO'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HISTORIAL */}
            <div style={crdEstilo}>
              <h4 style={{ margin: 0, marginBottom: '35px', color: '#64748B', fontSize: '15px', fontWeight: '900', textTransform:'uppercase' }}>📜 Ventas Registradas</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {historialVentasHoy.map(grupo => (
                  <div key={grupo.id_grupo} style={{ padding: '30px', backgroundColor: '#FFF5F7', borderRadius: '35px', border: `1px solid #FCC2E2` }}>
                    {editandoGrupoId === grupo.id_grupo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px', backgroundColor:'#fff', padding:'25px', borderRadius:'25px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                         <input value={formEditCliente.nombre} onChange={e=>setFormEditCliente({...formEditCliente, nombre: e.target.value})} style={inpEstilo} placeholder="Nombre Cliente" />
                         <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                            <input value={formEditCliente.localidad} onChange={e=>setFormEditCliente({...formEditCliente, localidad: e.target.value})} style={inpEstilo} placeholder="Zona" />
                            <input value={formEditCliente.telefono} onChange={e=>setFormEditCliente({...formEditCliente, telefono: e.target.value})} style={inpEstilo} placeholder="WhatsApp" />
                         </div>
                         <div style={{ display:'flex', gap:'15px', marginTop:'10px' }}>
                            <button onClick={() => guardarCambiosCli(grupo)} style={{ backgroundColor:'#16A34A', color:'#fff', padding:'18px', borderRadius:'15px', flex:2, fontWeight:'900' }}>GUARDAR CAMBIOS</button>
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
                           <button onClick={() => enviarWhatsAppVenta(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '15px', cursor:'pointer', fontWeight:'900', fontSize:'13px' }}>TICKET 📱</button>
                           <button onClick={() => prepararEdicionCliente(grupo)} style={{ border:'none', background:'#fff', padding:'12px', borderRadius:'15px', cursor:'pointer', border:'2px solid #FCC2E2' }}>✏️</button>
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
                                        <button onClick={() => corregirCantidadVendida(v)} style={{ background:'#16A34A', color:'#fff', padding:'10px 20px', borderRadius:'12px', fontWeight:'900' }}>OK</button>
                                        <button onClick={() => setIdItemVentaEditando(null)} style={{ background:'#64748B', color:'#fff', padding:'10px 20px', borderRadius:'12px', fontWeight:'900' }}>X</button>
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

        {/* ============================================================ */}
        {/* TAB 2: MÓDULO DE LOGÍSTICA                                   */}
        {/* ============================================================ */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ ...crdEstilo, backgroundColor: '#1E1B1C', color: '#fff', padding: '60px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: '900' }}>📦 Entregas Pendientes</h2>
                <p style={{ opacity: 0.7, fontSize: '20px', marginTop:'15px' }}>Productos cobrados que esperan ser retirados del almacén.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                {pendientesAlmacen.map((grupo, idx) => (
                    <div key={idx} style={{ ...crdEstilo, borderLeft: `15px solid ${FUCSIA_PRINCIPAL}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                            <div>
                                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, fontWeight:'900', fontSize:'1.8rem' }}>{grupo.cliente}</h3>
                                <p style={{ fontSize: '15px', color: '#64748B', fontWeight:'900', margin: '8px 0' }}>📍 ZONA: {grupo.localidad}</p>
                            </div>
                            <button onClick={() => {
                                let m = `¡Hola *${grupo.cliente}*! 👋 Tu pedido en B J Importaciones está listo para retirar. ✨📦`;
                                window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${m}`, '_blank');
                            }} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '15px 22px', borderRadius: '15px', fontWeight:'900' }}>AVISAR 📱</button>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '25px', padding: '25px', marginBottom: '25px' }}>
                            {grupo.items.map((it, iIdx) => (
                                <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', padding: '10px 0', borderBottom: iIdx === grupo.items.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                                    <span><strong>{it.cantidad}x</strong> {productos.find(p=>p.id===it.producto_id)?.nombre || 'Producto'}</span>
                                    <strong style={{ fontSize:'18px' }}>S/ {(it.precio_venta_unitario * it.cantidad).toFixed(2)}</strong>
                                </div>
                            ))}
                            <div style={{textAlign:'right', marginTop:'30px', borderTop:'5px solid #E2E8F0', paddingTop: '20px'}}>
                                <strong style={{ color: '#16A34A', fontSize:'2.2rem', fontWeight: '900' }}>Total: S/ {grupo.totalVenta.toFixed(2)}</strong>
                            </div>
                        </div>
                        <button onClick={async () => { if(confirm(`¿Entrega completa?`)) { for(let i of grupo.items) await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id', i.id); alert("Entregado!"); } }} style={{ width: '100%', backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900', fontSize: '18px' }}>✅ MARCAR ENTREGADO</button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: MÓDULO DE GESTIÓN (RESTAURADA Y BLINDADA)              */}
        {/* ============================================================ */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
            
            <div style={{ ...crdEstilo, border: `4px solid ${FUCSIA_PRINCIPAL}` }}>
                <h3 style={{ margin: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize:'1.8rem' }}>📊 Auditoría de Capital BJ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '35px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>DINERO EN STOCK (COSTO)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem' }}>S/ {Number(auditoriaInventario.cost || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#FFF1F2', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: FUCSIA_PRINCIPAL, textTransform: 'uppercase' }}>RETORNO ESTIMADO (VENTA)</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem', color: FUCSIA_PRINCIPAL }}>S/ {Number(auditoriaInventario.vent || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                    <div style={{ backgroundColor: '#F0FDF4', padding: '35px', borderRadius: '35px' }}>
                        <small style={{ fontWeight: '900', color: '#16A34A', textTransform: 'uppercase' }}>UTILIDAD PROYECTADA</small>
                        <h3 style={{ margin: '10px 0', fontSize: '2.5rem', color: '#16A34A' }}>S/ {Number(auditoriaInventario.util || 0).toLocaleString('es-PE', {minimumFractionDigits:2})}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px' }}>
              <div style={{ ...crdEstilo, borderLeft: `10px solid ${FUCSIA_PRINCIPAL}`, padding: '25px' }}><small style={{fontWeight:'bold', opacity:0.6}}>EGRESOS</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {Number(balanceGeneral.egresosTotales || 0).toFixed(2)}</h4></div>
              <div style={{ ...crdEstilo, borderLeft: '10px solid #16A34A', padding: '25px' }}><small style={{fontWeight:'bold', opacity:0.6}}>EXTRAS</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {Number(balanceGeneral.ingresosExtras || 0).toFixed(2)}</h4></div>
              <div style={{ ...crdEstilo, borderLeft: '10px solid #3B82F6', padding: '25px' }}><small style={{fontWeight:'bold', opacity:0.6}}>GANANCIA TOTAL</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {Number(balanceGeneral.gananciaTotalAcumulada || 0).toFixed(2)}</h4></div>
              <div style={{ ...crdEstilo, backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', padding: '25px' }}><small style={{fontWeight:'bold'}}>CAJA EFECTIVO</small><h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {Number(balanceGeneral.efectivoEnCaja || 0).toFixed(2)}</h4></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '40px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* REGISTRAR GASTO */}
                <div style={crdEstilo}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>💸 Movimiento de Caja</h4>
                  <form onSubmit={registrarGastoManual} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={inpEstilo}>
                      <option value="Gasto Local">🏪 Gasto Local</option>
                      <option value="Inversión (Mercadería)">📦 Inversión (Mercadería)</option>
                      <option value="Retiro Personal">🏧 Retiro Personal</option>
                      <option value="Ingreso Adicional">💰 Ingreso Adicional</option>
                    </select>
                    <input placeholder="Descripción..." value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={inpEstilo} />
                    <input type="text" placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={inpEstilo} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '900', cursor:'pointer' }}>GUARDAR</button>
                  </form>
                </div>
                {/* CARGAR PRODUCTO */}
                <div style={{ ...crdEstilo, border: `3px solid ${FUCSIA_PRINCIPAL}` }}>
                  <h4 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '900', fontSize:'1.2rem' }}>🆕 Cargar Producto al Sistema</h4>
                  <form onSubmit={handleAddProducto} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Nombre Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={inpEstilo} />
                    <input placeholder="Colores (comas: Rojo, Azul, Negro)" value={formProd.colores} onChange={e => setFormProd({...formProd, colores: e.target.value})} style={inpEstilo} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="Costo S/" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={inpEstilo} />
                        <input type="number" placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={inpEstilo} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <input type="text" placeholder="P. MAYOR" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={{...inpEstilo, border:'3px solid #F786C1'}} />
                        <input type="text" placeholder="P. MINOR" value={formProd.precio_menor} onChange={e => setFormProd({...formProd, precio_menor: handleInputMonto(e.target.value)})} style={{...inpEstilo, border:'3px solid #1E1B1C'}} />
                    </div>
                    <button type="submit" style={{ backgroundColor: '#1E1B1C', color: '#fff', border: 'none', padding: '22px', borderRadius: '22px', fontWeight: '900' }}>CREAR PRODUCTO</button>
                  </form>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {/* AJUSTE STOCK */}
                <div style={crdEstilo}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '25px', fontWeight: '900', fontSize:'1.4rem' }}>🔧 Ajuste de Stock</h4>
                  <input placeholder="🔍 Buscar modelo..." value={busquedaStock} onChange={e => setBusquedaStock(e.target.value)} style={{ ...inpEstilo, padding: '15px', marginBottom: '25px', border: `3px solid ${FUCSIA_PRINCIPAL}` }} />
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {productos.filter(p => p.nombre?.toLowerCase().includes(busquedaStock.toLowerCase())).map(p => (
                      <div key={p.id} style={{ padding: '25px', border: '1px solid #f1f1f1', borderRadius: '28px', backgroundColor: '#fff', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <strong style={{fontSize:'16px'}}>{p.nombre}</strong>
                          <button onClick={async () => { if(confirm("¿Borrar definitivamente?")) await supabase.from('productos').delete().eq('id', p.id); }} style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor:'pointer', fontSize: '1.8rem' }}>🗑️</button>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', backgroundColor: '#F8FAFC', padding: '18px', borderRadius: '20px', alignItems: 'center' }}>
                          <input type="number" value={formEditStock[p.id] !== undefined ? formEditStock[p.id] : p.stock} onChange={e => setFormEditStock({...formEditStock, [p.id]: Number(e.target.value)})} style={{ width: '90px', padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '18px', fontWeight: '900' }} />
                          <button onClick={() => actualizarStockCat(p)} style={{ background: '#1E1B1C', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '18px', fontSize: '13px', fontWeight: '900', flex: 1, cursor:'pointer' }}>GUARDAR</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LIBRO DIARIO CON FECHAS */}
                <div style={crdEstilo}>
                  <h4 style={{ marginTop: 0, marginBottom: '30px', fontWeight: '900', fontSize: '1.4rem' }}>📖 Libro Diario Detallado</h4>
                  <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                      <tbody>
                        {finanzas.map(f => (
                          <tr key={f.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                            {idFinanzaEditando === f.id ? (
                               <td colSpan="3" style={{ padding: '25px', backgroundColor: '#FFF5F7', borderRadius: '30px', border: `2px solid ${FUCSIA_PRINCIPAL}` }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <select value={formEditFinanza.tipo} onChange={e=>setFormEditFinanza({...formEditFinanza, tipo:e.target.value})} style={inpEstilo}><option value="Gasto Local">Gasto Local</option><option value="Inversión (Mercadería)">Inversión (Mercadería)</option><option value="Retiro Personal">Retiro Personal</option><option value="Ingreso Adicional">Ingreso Adicional</option></select>
                                      <input value={formEditFinanza.descripcion} onChange={e=>setFormEditFinanza({...formEditFinanza, descripcion:e.target.value})} style={inpEstilo} />
                                      <input type="text" value={formEditFinanza.monto} onChange={e=>setFormEditFinanza({...formEditFinanza, monto:handleInputMonto(e.target.value)})} style={inpEstilo} />
                                      <div style={{display:'flex', gap:'15px', marginTop: '10px'}}><button onClick={updateGastoLibro} style={{backgroundColor:'#16A34A', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:2, fontWeight:'900', cursor:'pointer' }}>OK</button><button onClick={()=>setIdFinanzaEditando(null)} style={{background:'#64748B', color:'#fff', padding:'20px', borderRadius:'18px', border:'none', flex:1, fontWeight:'900', cursor:'pointer'}}>X</button></div>
                                  </div>
                               </td>
                            ) : (
                              <>
                                <td style={{ padding: '22px 10px' }}>
                                    <small style={{fontWeight:'900', color:'#64748B', display:'block', marginBottom:'5px'}}>{getFechaPeru(f.created_at)} | {getHoraPeru(f.created_at)}</small>
                                    <small style={{fontWeight:'900', color:FUCSIA_PRINCIPAL, textTransform:'uppercase'}}>{f.tipo}</small>
                                    <br/><span style={{ fontWeight: '600', fontSize: '16px' }}>{f.descripcion}</span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '22px 10px', fontWeight: '900', fontSize: '18px', color: (f.tipo.includes('Ingreso')) ? '#16A34A' : '#1E1B1C' }}>S/ {(Number(f.monto) || 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right', padding: '22px 10px' }}>
                                  <button onClick={()=> { setIdFinanzaEditando(f.id); setFormEditFinanza({...f}); }} style={{background:'none', border:'none', cursor:'pointer', fontSize: '1.4rem', marginRight:'12px'}}>✏️</button>
                                  <button onClick={async ()=> { if(confirm("¿Borrar movimiento?")) await supabase.from('finanzas').delete().eq('id', f.id); }} style={{background:'none', border:'none', color: FUCSIA_PRINCIPAL, cursor:'pointer', fontSize: '1.4rem'}}>🗑️</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GRÁFICO ROI */}
                <div style={crdEstilo}>
                  <h4 style={{ marginTop: 0, color: FUCSIA_PRINCIPAL, marginBottom: '35px', fontWeight: '900', fontSize: '1.4rem' }}>📈 ROI / Retorno de Inversión</h4>
                  <div style={{ height: '350px', width: '100%' }}>
                    {(auditoriaInventario.cost > 0) && (
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 25, right: 30, left: -5, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" fontSize={13} fontWeight="900" axisLine={false} tickLine={false} dy={15} />
                            <YAxis fontSize={13} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v)=> `S/ ${v.toLocaleString()}`} contentStyle={{ borderRadius: '25px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontWeight: '900' }} />
                            <Bar dataKey="val" radius={[20, 20, 0, 0]} barSize={80} />
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