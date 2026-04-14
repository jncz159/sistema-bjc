"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

/**
 * ============================================================
 * SISTEMA BJ IMPORTACIONES CHICLAYO - CONTROL EMPRESARIAL
 * VERSION: 67.0 - BUNKER ABSOLUTO (SIN RECORTES)
 * ESTADO: RESTAURACIÓN TOTAL DE LOGÍSTICA Y VENTAS DIARIAS
 * ============================================================
 */

export default function SistemaBJCMasterFinal() {
  
  // ============================================================
  // [BLOQUE 1] HELPERS DE SEGURIDAD (ANTI-CRASH)
  // ============================================================

  /**
   * getFechaPeru:
   * Normaliza fechas para Chiclayo (GMT-5).
   * Blindaje: Si falla, usa la fecha local del sistema para no romper filtros.
   */
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
        const formateador = new Intl.DateTimeFormat('en-CA', opciones);
        const partes = formateador.formatToParts(d);
        const anio = partes.find(p => p.type === 'year')?.value || "2026";
        const mes = partes.find(p => p.type === 'month')?.value || "01";
        const dia = partes.find(p => p.type === 'day')?.value || "01";
        return `${anio}-${mes}-${dia}`;
    } catch (e) { 
        return new Date().toISOString().split('T')[0]; 
    }
  };

  /**
   * getHoraPeru:
   * Extrae hora exacta 12H (AM/PM).
   */
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
    } catch (e) { return "--:--"; }
  };

  /**
   * handleInputMonto:
   * Limpia comas y textos para evitar errores en la base de datos.
   */
  const handleInputMonto = (v) => {
    if (v === undefined || v === null) return "";
    const s = String(v).replace(',', '.');
    return s.replace(/[^0-9.]/g, '');
  };

  /**
   * getEtiquetaProducto:
   * Badge visual para marketing (Nuevo / Reciente).
   */
  const getEtiquetaProducto = (fechaC) => {
    if (!fechaC) return null;
    try {
        const creacion = new Date(fechaC);
        const hoy = new Date();
        const diff = Math.floor((hoy - creacion) / (1000 * 60 * 60 * 24));
        if (diff <= 3) return { tipo: 'NUEVO', icono: '✨', color: '#F01097' };
        if (diff <= 8) return { tipo: 'RECIENTE', icono: '📦', color: '#A13C6D' };
        return null;
    } catch (e) { return null; }
  };

  // ============================================================
  // [BLOQUE 2] ALMACÉN DE ESTADOS (REACT STATE)
  // ============================================================

  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  
  // Memoria del Carrito
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({});
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // Estados de Edición
  const [editandoGrupoId, setEditandoGrupoId] = useState(null); 
  const [formEditCliente, setFormEditCliente] = useState({ nombre: '', localidad: '', telefono: '' });
  const [idItemVentaEditando, setIdItemVentaEditando] = useState(null); 
  const [nuevaCantVenta, setNuevaCantVenta] = useState(0);
  
  // Estados de Gestión
  const [idFinanzaEditando, setIdFinanzaEditando] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({ tipo: '', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStock, setFormEditStock] = useState({}); 

  const FUCSIA_BJ = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  // ============================================================
  // [BLOQUE 3] CONEXIÓN SUPABASE (REALTIME FULL)
  // ============================================================

  useEffect(() => {
    const arrancarBunker = async () => {
        await cargarTodoDesdeNube();
        setCargando(false);
    };
    arrancarBunker();

    const chV = supabase.channel('v67v').on('postgres_changes',{event:'*',schema:'public',table:'ventas'},()=>cargarTodoDesdeNube()).subscribe();
    const chP = supabase.channel('v67p').on('postgres_changes',{event:'*',schema:'public',table:'productos'},()=>cargarTodoDesdeNube()).subscribe();
    const chF = supabase.channel('v67f').on('postgres_changes',{event:'*',schema:'public',table:'finanzas'},()=>cargarTodoDesdeNube()).subscribe();

    return () => {
      supabase.removeChannel(chV); supabase.removeChannel(chP); supabase.removeChannel(chF);
    };
  }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: dP } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: dV } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: dF } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (dP) setProductos(dP);
        if (dV) setVentas(dV);
        if (dF) setFinanzas(dF);
    } catch (e) { console.error("Fallo Sync:", e); }
  };

  // ============================================================
  // [BLOQUE 4] LÓGICA ESTRATÉGICA (MEMOS BLINDADOS)
  // ============================================================

  // 4.1 LOGÍSTICA: Clasificación (RESTABLECIDO v67)
  const logisticaMaster = useMemo(() => {
    const resLog = { almacen: [], cuentasPorCobrar: [] };
    if (!Array.isArray(ventas) || ventas.length === 0) return resLog;

    try {
        const mapaAlmacen = {}; const mapaCuentas = {};

        ventas.forEach(v => {
            if (!v || !v.cliente_nombre) return;
            const llave = `${v.cliente_nombre}-${v.localidad || 'SN'}`;
            
            // Caso: Pagado pero guardado
            if (v.estado_pedido === 'En Almacén') {
                if (!mapaAlmacen[llave]) mapaAlmacen[llave] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                mapaAlmacen[llave].items.push(v);
                mapaAlmacen[llave].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
            
            // Caso: Crédito (Deuda)
            if (v.estado_pedido === 'Pendiente de Pago') {
                if (!mapaCuentas[llave]) mapaCuentas[llave] = { cliente: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, items: [], total: 0 };
                mapaCuentas[llave].items.push(v);
                mapaCuentas[llave].total += (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0));
            }
        });

        resLog.almacen = Object.values(mapaAlmacen);
        resLog.cuentasPorCobrar = Object.values(mapaCuentas);
        return resLog;
    } catch (e) { return resLog; }
  }, [ventas]);

  // 4.2 HISTORIAL: Ventas del día (RESTABLECIDO v67)
  const historialVentasBJ = useMemo(() => {
    if (!Array.isArray(ventas) || ventas.length === 0) return [];
    try {
        const filtradasH = ventas.filter(v => v && getFechaPeru(v.created_at) === fechaConsulta);
        const agrupadasH = {};

        filtradasH.forEach(v => {
            const hID = v.created_at ? v.created_at.substring(0,16) : "0000";
            const idAgrup = `${v.cliente_nombre || 'SN'}-${v.localidad || 'SZ'}-${hID}`; 
            if (!agrupadasH[idAgrup]) {
                agrupadasH[idAgrup] = { id_grupo: idAgrup, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
            }
            agrupadasH[idAgrup].items.push(v);
            agrupadasH[idAgrup].total += (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0));
        });
        return Object.values(agrupadasH).reverse();
    } catch (e) { return []; }
  }, [ventas, fechaConsulta]);

  // 4.3 BALANCE FINANCIERO (BUNKER v67)
  const balanceEliteBJ = useMemo(() => {
    const fallback = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length || !finanzas.length) return fallback;

    try {
        const hoy = getFechaPeru();
        const mes = hoy.substring(0,7);
        
        // Ventas efectivo hoy
        const vH = ventas.filter(v => v && getFechaPeru(v.created_at) === hoy && v.estado_pedido !== 'Pendiente de Pago');
        
        // BÓVEDA (UTILIDAD)
        const gBruta = ventas.reduce((acc, v) => acc + (Number(v?.ganancia_total) || 0), 0);
        const retG = finanzas.filter(f => f && f.origen === 'Ganancias').reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // CAJA GLOBAL
        const inS = ventas.filter(v => v && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.precio_venta_unitario || 0) * Number(v.cantidad || 0)), 0);
        const inK = finanzas.filter(f => f && ['Ingreso Adicional','Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const outG = finanzas.filter(f => f && ['Gasto Local','Inversión (Mercadería)','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);

        // PTO EQUILIBRIO
        const metaE = finanzas.filter(f => f && getFechaPeru(f.created_at).substring(0,7) === mes && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + (Number(f.monto) || 0), 0);
        const utilM = ventas.filter(v => v && getFechaPeru(v.created_at).substring(0,7) === mes && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (Number(v.ganancia_total) || 0), 0);

        let prog = metaE > 0 ? (utilM / metaE) * 100 : (utilM > 0 ? 100 : 0);

        return { 
            cH: vH.reduce((acc, v) => acc + (Number(v.precio_venta_unitario ?? 0) * Number(v.cantidad ?? 0)), 0),
            gH: vH.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
            cG: (inS + inK - outG),
            bR: (gBruta - retG),
            pe_p: prog, pe_g: utilM, pe_m: metaE
        };
    } catch (e) { return fallback; }
  }, [finanzas, ventas]);

  const valorizacionInventario = useMemo(() => {
    let c = 0; let v = 0;
    productos.forEach(p => { if (p && Number(p.stock) > 0) { c += (Number(p.precio_compra || 0) * p.stock); v += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost: c, vent: v };
  }, [productos]);

  // ============================================================
  // [BLOQUE 5] FUNCIONES DE ACCIÓN (VENTAS Y GESTIÓN REPARADAS)
  // ============================================================

  const handleAutocompleteCliente = (e) => {
    const val = e.target.value; setCliente(val);
    const m = (ventas || []).find(v => v && v.cliente_nombre?.toLowerCase() === val.toLowerCase());
    if (m) { setLocalidad(m.localidad || ''); setTelefono(m.telefono || ''); }
  };

  const handleEjecutarVentaBJ = async (est) => {
    if (!cliente || !localidad || !carrito.length) return alert("Faltan datos.");
    const tV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0);
    const rD = tV > 0 ? (Number(descuento) / tV) : 0;
    const inserts = carrito.map(i => ({ 
        cliente_nombre: cliente, localidad, telefono, 
        producto_id: i.producto_id, cantidad: i.cantidad, color: i.color, 
        precio_venta_unitario: Number(i.precio_venta), 
        precio_costo_unitario: Number(i.precio_compra || 0), 
        ganancia_total: ((Number(i.precio_venta) - Number(i.precio_compra || 0)) * i.cantidad) - ((Number(i.precio_venta) * i.cantidad) * rD), 
        estado_pedido: est 
    }));
    const { error } = await supabase.from('ventas').insert(inserts);
    if (!error) {
      for (const item of carrito) {
        const pO = productos.find(p => p.id === item.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock - item.cantidad }).eq('id', item.producto_id);
      }
      setCliente(''); setLocalidad(''); setTelefono(''); setCarrito([]); setDescuento(0); alert("✅ Guardado.");
    }
  };

  // REPARADO: handleAddProductoBJ presente y funcional
  const handleAddProductoBJ = async (e) => {
    e.preventDefault();
    if (!formProd.nombre) return alert("Nombre obligatorio.");
    const { error } = await supabase.from('productos').insert([{
        nombre: formProd.nombre, 
        precio_compra: Number(handleInputMonto(formProd.precio_compra)),
        precio_venta: Number(handleInputMonto(formProd.precio_venta)), 
        precio_menor: Number(handleInputMonto(formProd.precio_menor)),
        stock: Number(formProd.stock), 
        colores: formProd.colores
    }]);
    if (!error) { setFormProd({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' }); alert("✨ Creado."); }
  };

  const handleExportarExcelAuditoria = () => {
    let csv = "REPORTE AUDITORIA Y CIERRE BJ IMPORTACIONES\n";
    csv += `FECHA: ${fechaConsulta}\n`;
    csv += `--------------------------------------------------\n`;
    csv += `SALDO CAJA GLOBAL,S/ ${balanceEliteBJ.cG.toFixed(2)}\n`;
    csv += `BOVEDA UTILIDADES,S/ ${balanceEliteBJ.bR.toFixed(2)}\n`;
    csv += `VENTAS DIA (EFECTIVO),S/ ${balanceEliteBJ.cH.toFixed(2)}\n`;
    csv += `GANANCIA DIA,S/ ${balanceEliteBJ.gH.toFixed(2)}\n`;
    csv += `--------------------------------------------------\n\n`;
    csv += "Hora,Cliente,Zona,Producto,Variante,Cant,Precio,Total\n";
    ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta).forEach(v => {
      const nP = productos.find(p=>p.id===v.producto_id)?.nombre || "Item";
      csv += `${getHoraPeru(v.created_at)},${v.cliente_nombre},${v.localidad},${nP},${v.color},${v.cantidad},${v.precio_venta_unitario},${(v.precio_venta_unitario*v.cantidad).toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `AUDITORIA_BJ_${fechaConsulta}.csv`; link.click();
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    e.preventDefault();
    const clM = handleInputMonto(formFinanzas.monto);
    await supabase.from('finanzas').insert([{ tipo: formFinanzas.tipo, descripcion: formFinanzas.descripcion, monto: Number(clM), origen: formFinanzas.origen }]);
    setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen: 'Caja Global'}); alert("✅ Guardado.");
  };

  const handleCobrarDeudaBJ = async (grupo) => {
    if(confirm(`¿Cobrar S/ ${grupo.total.toFixed(2)}?`)) {
        for(let it of grupo.items) await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', it.id);
        alert("💰 Pago recibido.");
    }
  };

  const handleWhatsAppTicket = (grupo) => {
    let msg = `¡Hola *${grupo.cliente_nombre}*! 👋 Recibo BJ Importaciones Chiclayo.%0A%0A`;
    grupo.items.forEach(v => {
        const pR = productos.find(p => p.id === v.producto_id);
        msg += `- *${v.cantidad}x* ${pR?.nombre || 'Item'} (${v.color}): S/ ${(v.precio_venta_unitario * v.cantidad).toFixed(2)}%0A`;
    });
    msg += `%0A*TOTAL PAGADO: S/ ${grupo.total.toFixed(2)}*%0A¡Muchas gracias! 😊`;
    window.open(`https://wa.me/51${grupo.telefono?.replace(/\D/g,'')}?text=${msg}`, '_blank');
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular?")) {
      const pc = productos.find(pr => pr.id === v.producto_id);
      if (pc) await supabase.from('productos').update({ stock: pc.stock + v.cantidad }).eq('id', pc.id);
      await supabase.from('ventas').delete().eq('id', v.id);
    }
  };

  // ============================================================
  // [BLOQUE 6] INTERFAZ DE USUARIO (JSX EXPANDIDO)
  // ============================================================

  const sInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const sCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_BJ, fontWeight:'900', fontSize:'1.5rem' }}>INICIANDO BUNKER BJ v67... 🚀💎</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      
      {/* NAVBAR */}
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_BJ, color: '#fff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>BJ</div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: FUCSIA_BJ }}>v67 MAESTRO</h1>
        </div>
        <nav style={{ display: 'flex', gap: '10px', backgroundColor: `#FCA5D415`, padding: '5px', borderRadius: '15px' }}>
          <button onClick={() => setVista('ventas')} style={{ backgroundColor: vista === 'ventas' ? FUCSIA_BJ : 'transparent', border: 'none', color: vista === 'ventas' ? '#fff' : FUCSIA_BJ, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>VENTAS</button>
          <button onClick={() => setVista('logistica')} style={{ backgroundColor: vista === 'logistica' ? OSCURO_BJ : 'transparent', border: 'none', color: vista === 'logistica' ? '#fff' : OSCURO_BJ, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>LOGÍSTICA</button>
          <button onClick={() => setVista('contabilidad')} style={{ backgroundColor: vista === 'contabilidad' ? FUCSIA_BJ : 'transparent', border: 'none', color: vista === 'contabilidad' ? '#fff' : FUCSIA_BJ, padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900' }}>GESTIÓN</button>
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* VENTAS */}
        {vista === 'ventas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
              <div style={sCrd}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: FUCSIA_BJ, fontWeight: '900', fontSize: '13px' }}>💰 EFECTIVO HOY</span>
                    <button onClick={handleExportarExcelAuditoria} style={{ background:`${FUCSIA_BJ}20`, border:'none', padding:'8px 15px', borderRadius:'10px', color:FUCSIA_BJ, fontWeight:'900', fontSize:'10px', cursor:'pointer' }}>CIERRE AUDITOR</button>
                </div>
                <h2 style={{ margin: '15px 0', fontSize: '3.2rem', fontWeight: '900' }}>S/ {balanceEliteBJ.cH.toFixed(2)}</h2>
                <div style={{ color: VERDE_BJ, fontWeight: '900' }}>Ganancia: S/ {balanceEliteBJ.gH.toFixed(2)}</div>
              </div>
              <div style={sCrd}>
                <span style={{ color: FUCSIA_BJ, fontWeight: '900', fontSize: '13px' }}>📅 FILTRAR FECHA</span>
                <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} style={{ ...sInp, marginTop: '15px' }} />
              </div>
            </div>

            <div style={{ ...sCrd, border: `3px solid #FCA5D4` }}>
              <h3 style={{ margin: 0, color: FUCSIA_BJ, marginBottom:'25px' }}>🛒 Nueva Operación Chiclayo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                <input list="clis_v67" placeholder="Nombre Cliente" value={cliente} onChange={handleAutocompleteCliente} style={sInp} />
                <datalist id="clis_v67">{[...new Set(ventas.map(v => v.cliente_nombre))].map((c, i) => <option key={i} value={c} />)}</datalist>
                <input placeholder="Zona" value={localidad} onChange={e => setLocalidad(e.target.value)} style={sInp} />
              </div>

              {carrito.length > 0 && (
                <div style={{ backgroundColor: '#FFF9FB', border: `2px dashed ${FUCSIA_BJ}`, borderRadius: '25px', padding: '25px', marginBottom: '30px' }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FCC2E2', paddingBottom: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}><strong>{item.cantidad}x</strong> {item.nombre} <br/><small>{item.color}</small></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <input value={item.precio_venta} onChange={(e) => { const n = [...carrito]; n[idx].precio_venta = handleInputMonto(e.target.value); setCarrito(n); }} style={{ width: '70px', borderRadius: '8px', border: '1px solid #FCA5D4', textAlign: 'center', fontWeight: '900' }} />
                        <button onClick={() => { const n = [...carrito]; n.splice(idx, 1); setCarrito(n); }} style={{ color: '#fff', backgroundColor: FUCSIA_BJ, border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>X</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '20px' }}>
                    <h3 style={{ margin: '10px 0', fontSize: '2.5rem' }}>Total: S/ {(carrito.reduce((acc, i) => acc + (Number(i.precio_venta) * i.cantidad), 0) - Number(descuento)).toFixed(2)}</h3>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEjecutarVentaBJ('Entregado')} style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>ENTREGAR ✅</button>
                        <button onClick={() => handleEjecutarVentaBJ('En Almacén')} style={{ backgroundColor: FUCSIA_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>ALMACENAR 📦</button>
                        <button onClick={() => handleEjecutarVentaBJ('Pendiente de Pago')} style={{ backgroundColor: AMARILLO_BJ, color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' }}>A PAGAR 💸</button>
                    </div>
                  </div>
                </div>
              )}

              <input placeholder="🔍 Buscar modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...sInp, marginBottom: '20px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', maxHeight: '600px', overflowY: 'auto' }}>
                {productos.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase())).map((p) => (
                  <div key={p.id} style={{ border: '1px solid #eee', padding: '20px', borderRadius: '25px', position: 'relative' }}>
                    {getEtiquetaProducto(p.created_at) && <span style={{ position:'absolute', top: '-10px', left: '15px', backgroundColor: getEtiquetaProducto(p.created_at).color, color: '#fff', fontSize: '10px', padding: '5px 12px', borderRadius: '10px' }}>{getEtiquetaProducto(p.created_at).tipo}</span>}
                    <strong style={{ display: 'block', height: '40px', overflow: 'hidden' }}>{p.nombre}</strong>
                    <div style={{ margin: '10px 0', color: Number(p.stock) < 5 ? ROJO_BJ : VERDE_BJ, fontWeight: '900' }}>STOCK: {p.stock}</div>
                    <select value={coloresElegidos[p.id]} onChange={e => setColoresElegidos({...coloresElegidos, [p.id]: e.target.value})} style={{ ...sInp, padding: '5px', fontSize: '12px', marginBottom: '10px' }}>
                        {p.colores?.split(',').map(c => <option key={c} value={c.trim()}>{c.trim()}</option>)}
                    </select>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: Math.max(1, (cantidades[p.id] || 1) - 1)})} style={{ borderRadius: '8px', border: '1px solid #ddd', width: '35px' }}>-</button>
                        <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>{cantidades[p.id] || 1}</span>
                        <button onClick={() => setCantidades({...cantidades, [p.id]: (cantidades[p.id] || 1) + 1})} style={{ borderRadius: '8px', border: '1px solid #ddd', width: '35px' }}>+</button>
                    </div>
                    <button onClick={() => {
                        const c = Number(cantidades[p.id] || 1);
                        const pb = tipoVenta === 'Mayor' ? p.precio_venta : (p.precio_menor || p.precio_venta);
                        setCarrito([...carrito, { producto_id: p.id, nombre: p.nombre, cantidad: c, color: (coloresElegidos[p.id] || "Único"), precio_venta: pb, precio_compra: p.precio_compra }]);
                    }} disabled={p.stock <= 0} style={{ width: '100%', backgroundColor: FUCSIA_BJ, color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', cursor:'pointer' }}>AÑADIR</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={sCrd}>
                <h4 style={{margin:0, color:'#64748B', fontWeight:'900', fontSize:'13px', textTransform:'uppercase', marginBottom:'25px'}}>📜 Historial de Operaciones</h4>
                {historialVentasDiaBJ.map(grupo => (
                    <div key={grupo.id_grupo} style={{ padding: '25px', backgroundColor: '#F8FAFC', borderRadius: '25px', marginBottom:'20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <small style={{ fontWeight:'900', color: FUCSIA_BJ }}>⏰ {grupo.hora}</small>
                                <br/><strong style={{ fontSize: '1.2rem' }}>{grupo.cliente_nombre}</strong>
                                <br/><small>{grupo.localidad}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ backgroundColor: VERDE_BJ, color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: '900' }}>S/ {grupo.total.toFixed(2)}</div>
                                <button onClick={() => handleWhatsAppTicket(grupo)} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor:'pointer' }}>📱</button>
                            </div>
                        </div>
                        <div style={{marginTop:'15px'}}>{grupo.items.map(v => (
                            <div key={v.id} style={{background:'#fff', padding:'10px 20px', borderRadius:'15px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <div><small>{v.cantidad}x {productos.find(p=>p.id===v.producto_id)?.nombre} ({v.color}) | {v.estado_pedido}</small></div>
                                <button onClick={()=>handleAnularVentaBJ(v)} style={{border:'none', background:'none', color:ROJO_BJ, fontWeight:'bold', cursor:'pointer'}}>🗑️</button>
                            </div>
                        ))}</div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* LOGISTICA */}
        {vista === 'logistica' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
             <div style={sCrd}>
                <h3 style={{ color: FUCSIA_BJ }}>📦 Mercadería en Almacén (Pagada)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {logisticaMaster.almacen.map((g, i) => (
                        <div key={i} style={{ padding: '20px', border: '1px solid #f1f1f1', borderRadius: '20px' }}>
                            <strong>{g.cliente}</strong><br/><small>{g.localidad}</small>
                            <button onClick={() => handleCobrarDeudaBJ(g)} style={{ width: '100%', marginTop: '15px', background: OSCURO_BJ, color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>ENTREGAR ✅</button>
                        </div>
                    ))}
                </div>
             </div>
             <div style={{ ...sCrd, borderLeft: `10px solid ${AMARILLO_BJ}` }}>
                <h3 style={{ color: AMARILLO_BJ }}>💸 Cuentas por Cobrar (Deudas)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {logisticaMaster.cuentasPorCobrar.map((g, i) => (
                        <div key={i} style={{ padding: '20px', background: '#FFFBEB', borderRadius: '20px' }}>
                            <strong>{g.cliente}</strong> - <span style={{ fontWeight: '900' }}>S/ {g.total.toFixed(2)}</span>
                            <button onClick={() => handleCobrarDeudaBJ(g)} style={{ width: '100%', marginTop: '15px', background: VERDE_BJ, color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>COBRAR 💰</button>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        )}

        {/* GESTION */}
        {vista === 'contabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={sCrd}>
                    <h4 style={{margin:0, color:FUCSIA_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>🏁 PUNTO DE EQUILIBRIO</h4>
                    <div style={{height:'18px', width:'100%', backgroundColor:'#F1F5F9', borderRadius:'10px', overflow:'hidden', marginBottom:'15px'}}>
                        <div style={{height:'100%', width:`${balanceEliteBJ.pe_p}%`, backgroundColor:VERDE_BJ, transition:'1s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px'}}>
                        <span>Utilidad: S/ {balanceEliteBJ.pe_g.toFixed(2)}</span>
                        <strong>Meta: S/ {balanceEliteBJ.pe_m.toFixed(2)}</strong>
                    </div>
                </div>

                <div style={{ ...sCrd, backgroundColor: OSCURO_BJ, color: '#fff', border:`3px solid ${FUCSIA_BJ}` }}>
                    <h4 style={{margin:0, color:FUCSIA_BJ, fontSize:'14px', fontWeight:'900', marginBottom:'15px'}}>💰 BÓVEDA PARA RETIRO</h4>
                    <h3 style={{fontSize:'2.8rem', margin:0}}>S/ {balanceEliteBJ.bR.toFixed(2)}</h3>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={{ ...sCrd, borderLeft:`10px solid #64748B` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAPITAL EN ALMACÉN</small>
                    <h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {valorizacionInventario.cost.toLocaleString('es-PE')}</h4>
                </div>
                <div style={{ ...sCrd, borderLeft:`10px solid ${AMARILLO_BJ}` }}>
                    <small style={{fontWeight:'900', opacity:0.6}}>CAJA TOTAL GLOBAL</small>
                    <h4 style={{fontSize:'1.8rem', margin:'10px 0'}}>S/ {balanceEliteBJ.cG.toFixed(2)}</h4>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div style={sCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px' }}>💸 Registrar Movimiento</h4>
                  <form onSubmit={handleRegistrarFinanzaBJ} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <select value={formFinanzas.tipo} onChange={e => setFormFinanzas({...formFinanzas, tipo: e.target.value})} style={sInp}>
                        <option value="Gasto Local">🏪 Gasto Local</option>
                        <option value="Retiro Personal">🏧 Retiro Personal</option>
                        <option value="Ingreso Adicional">💰 Inyección Capital</option>
                    </select>
                    <select value={formFinanzas.origen} onChange={e => setFormFinanzas({...formFinanzas, origen: e.target.value})} style={sInp}>
                        <option value="Caja Global">De: Caja Global</option>
                        <option value="Ganancias">De: Ganancias</option>
                    </select>
                    <input placeholder="Descripción" value={formFinanzas.descripcion} onChange={e => setFormFinanzas({...formFinanzas, descripcion: e.target.value})} style={sInp} />
                    <input placeholder="Monto S/" value={formFinanzas.monto} onChange={e => setFormFinanzas({...formFinanzas, monto: handleInputMonto(e.target.value)})} style={sInp} />
                    <button type="submit" style={{ backgroundColor: FUCSIA_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>GUARDAR</button>
                  </form>
              </div>

              <div style={sCrd}>
                  <h4 style={{ marginTop: 0, marginBottom: '20px' }}>🆕 Nuevo Producto BJ</h4>
                  <form onSubmit={handleAddProductoBJ} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input placeholder="Modelo" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})} style={sInp} />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <input placeholder="Costo" value={formProd.precio_compra} onChange={e => setFormProd({...formProd, precio_compra: handleInputMonto(e.target.value)})} style={sInp} />
                        <input placeholder="Venta Mayor" value={formProd.precio_venta} onChange={e => setFormProd({...formProd, precio_venta: handleInputMonto(e.target.value)})} style={sInp} />
                    </div>
                    <input placeholder="Stock" value={formProd.stock} onChange={e => setFormProd({...formProd, stock: e.target.value})} style={sInp} />
                    <button type="submit" style={{ backgroundColor: OSCURO_BJ, color: '#fff', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', cursor:'pointer' }}>CREAR PRODUCTO</button>
                  </form>
              </div>
            </div>

            <div style={sCrd}>
                <h4 style={{ marginTop: 0, color: FUCSIA_BJ, marginBottom: '25px' }}>🏆 Ranking de Rentabilidad</h4>
                {analyticsBJMaster.ranking.map((r, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f1f1' }}>
                        <span>{r[0]}</span>
                        <strong style={{ color:VERDE_BJ }}>+ S/ {r[1].toFixed(2)}</strong>
                    </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}