"use client";
/**
 * ============================================================================
 * SISTEMA: BUNKER BJ - MASTER CONTROL (v1.2 STABLE)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * CARACTERÍSTICAS: Auditoría de Caja Negra, Gestión de Deudas con Ítems, 
 * Sincronización de Stock y Prevención de Duplicidad.
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto, getHoraPeru } from '../lib/helpers';

// IMPORTACIÓN DE MÓDULOS (Asegúrate de que los archivos existan en /components)
import VentasSection from '../components/Ventas';
import AlmacenSection from '../components/Almacen';
import LogisticaSection from '../components/Logistica';
import GestionSection from '../components/Gestion';

export default function SistemaBJCMasterFinal() {
  
  // [BLOQUE A: ESTADOS GLOBALES DE LA APP]
  const [hasMounted, setHasMounted] = useState(false);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);

  // [BLOQUE B: ESTADOS DE CONTROL DE INTERFAZ]
  const [busqueda, setBusqueda] = useState(''); 
  const [busquedaStock, setBusquedaStock] = useState(''); 
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [fechaConsulta, setFechaConsulta] = useState(getFechaPeru());
  const [cliente, setCliente] = useState('');
  const [localidad, setLocalidad] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [tipoVenta, setTipoVenta] = useState('Mayor'); 
  const [cantidades, setCantidades] = useState({}); 
  const [coloresElegidos, setColoresElegidos] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [descuento, setDescuento] = useState(0); 

  // [BLOQUE C: ESTADOS DE FORMULARIOS Y EDICIÓN]
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [formEditStockBJ, setFormEditStockBJ] = useState({}); 
  const [idEditFinanza, setIdEditFinanza] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});

  // [BLOQUE D: ESTILOS MAESTROS BJ]
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';
  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '35px', padding: '35px', boxShadow: `0 20px 40px rgba(247, 134, 193, 0.1)`, border: '1px solid #FFF1F2' };

  // [BLOQUE E: CARGA DE DATOS]
  useEffect(() => { setHasMounted(true); cargarTodoDesdeNube(); }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f);
    } catch (e) { console.error("Error BJ Sync:", e); } finally { setCargando(false); }
  };

  // [BLOQUE F: EL CEREBRO DE CÁLCULO (useMemo)]
  
  // 1. BALANCE ELITE: Caja Actual, Utilidades y Punto de Equilibrio
  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length && !finanzas.length) return s;
    const hoyS = getFechaPeru();
    const mesI = hoyS.substring(0,7);

    // CAJA FÍSICA PROTEGIDA: Solo sumamos ventas directas que NO tengan abonos registrados en finanzas (Evita duplicidad)
    const ventasEfectivoDirecto = ventas.filter(v => 
        (v.estado_pedido === 'Entregado' || v.estado_pedido === 'En Almacén') && 
        !finanzas.some(f => f.descripcion === `Abono inicial venta crédito: ${v.cliente_nombre}` && v.created_at.substring(0,16) === f.created_at.substring(0,16))
    ).reduce((acc, v) => acc + (v.precio_venta_unitario * v.cantidad), 0);

    const ingresosFinanzas = finanzas.filter(f => ['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    const gastosFinanzas = finanzas.filter(f => !['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);
    
    // Cálculo mensual para punto de equilibrio
    const utMes = ventas.filter(v => getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    const gastosMes = finanzas.filter(f => getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);

    return {
        cH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + (v.precio_venta_unitario*v.cantidad), 0),
        gH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        cG: (ventasEfectivoDirecto + ingresosFinanzas) - gastosFinanzas,
        bR: ventas.reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0) - finanzas.filter(f => f.origen === 'Ganancias').reduce((acc, f) => acc + Number(f.monto), 0),
        pe_p: gastosMes > 0 ? (utMes / gastosMes) * 100 : (utMes > 0 ? 100 : 0), pe_g: utMes, pe_m: gastosMes
    };
  }, [ventas, finanzas]);

  // 2. VALORIZACIÓN DE STOCK
  const valorizacionStockBJ = useMemo(() => {
    let cost = 0; let vent = 0;
    productos.forEach(p => { if (Number(p.stock) > 0) { cost += (Number(p.precio_compra || 0) * p.stock); vent += (Number(p.precio_venta || 0) * p.stock); } });
    return { cost, vent };
  }, [productos]);

  // 3. ANALÍTICA: TOP 5 MÁS VENDIDOS
  const analiticaProBJ = useMemo(() => {
    const counts = {}; 
    ventas.forEach(v => { 
        if(v.estado_pedido !== 'Anulado' && v.estado_pedido !== 'Pendiente de Pago') {
            const name = productos?.find(p => p.id === v.producto_id)?.nombre || "Modelo Desconocido"; 
            counts[name] = (counts[name] || 0) + v.cantidad; 
        }
    });
    return { top: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  }, [ventas, productos]);

  // 4. LOGÍSTICA INTELIGENTE: Agrupación por cliente con lista de ítems
  const logisticaInteligente = useMemo(() => {
    const res = { almacen: [], deudas: [] };
    const mA = {}; const mD = {};
    ventas.forEach(v => {
        const key = `${v.cliente_nombre}-${v.localidad}`;
        const pM = productos?.find(p => p.id === v.producto_id);
        const it = { id: v.id, producto_id: v.producto_id, nombre: pM?.nombre, cantidad: v.cantidad, color: v.color, subtotal: (v.precio_venta_unitario * v.cantidad) };
        
        if (v.estado_pedido === 'En Almacén') { 
            if(!mA[key]) mA[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mA[key].items.push(it); mA[key].items_ids.push(v.id); mA[key].total += it.subtotal; 
        }
        if (v.estado_pedido === 'Pendiente de Pago') { 
            if(!mD[key]) mD[key]={cliente:v.cliente_nombre, localidad:v.localidad, items:[], items_ids:[], total:0}; 
            mD[key].items.push(it); mD[key].items_ids.push(v.id); mD[key].total += it.subtotal; 
        }
    });
    res.almacen = Object.values(mA); res.deudas = Object.values(mD);
    return res;
  }, [ventas, productos]);

  // 5. HISTORIAL GRUPAL DEL DÍA
  const historialVentasDiaBJ = useMemo(() => {
    const filt = ventas.filter(v => getFechaPeru(v.created_at) === fechaConsulta && v.cliente_nombre?.toLowerCase().includes(busquedaHistorial.toLowerCase()));
    const groups = {};
    filt.forEach(v => {
        const hId = `${v.cliente_nombre}-${v.created_at?.substring(0,16)}`; 
        if (!groups[hId]) groups[hId] = { id_grupo: hId, cliente_nombre: v.cliente_nombre, localidad: v.localidad, telefono: v.telefono, hora: getHoraPeru(v.created_at), total: 0, items: [] };
        groups[hId].items.push(v); groups[hId].total += (Number(v.precio_venta_unitario) * v.cantidad);
    });
    return Object.values(groups).reverse();
  }, [ventas, fechaConsulta, busquedaHistorial]);


  // [BLOQUE G: MANEJADORES DE OPERACIONES (ACCIÓN)]

  // 1. EJECUTAR VENTA (CON AUDITORÍA DE CAJA NEGRA)
  const handleEjecutarVentaBJ = async (estado, abonoInicial = 0) => {
    if (!cliente || !localidad) return alert("Faltan datos de cliente o zona.");
    const snapshotCaja = balanceEliteBJ.cG; // Captura para auditoría
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
    const montoACaja = estado === 'Pendiente de Pago' ? Number(abonoInicial) : totalV - Number(descuento);
    const ts = new Date().toISOString();

    const lista = carrito.map(i => {
        const ganancia = (Number(i.precio_venta) - Number(i.precio_compra)) * i.cantidad;
        return { 
            cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
            cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, 
            precio_costo_unitario: i.precio_compra, ganancia_total: ganancia, 
            estado_pedido: estado, created_at: ts 
        };
    });

    const { error: errV } = await supabase.from('ventas').insert(lista);
    if (!errV) {
        if (montoACaja > 0) {
            // Registro en Libro Diario
            await supabase.from('finanzas').insert([{ 
                tipo: 'Ingreso Adicional', 
                descripcion: estado === 'Pendiente de Pago' ? `Abono inicial venta crédito: ${cliente}` : `Venta Directa: ${cliente}`, 
                monto: montoACaja, origen: 'Caja Global', created_at: ts 
            }]);
            // Registro secreto en Auditoría
            await supabase.from('auditoria_bj').insert([{ 
                cliente, operacion: estado === 'Pendiente de Pago' ? 'CRÉDITO' : 'EFECTIVO', 
                monto_operacion: montoACaja, caja_antes: snapshotCaja, caja_despues: snapshotCaja + montoACaja 
            }]);
        }
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setCliente(''); setLocalidad(''); setTelefono(''); setDescuento(0);
        cargarTodoDesdeNube();
        alert("✅ Venta registrada y auditada correctamente.");
    }
  };

  // 2. COBRAR SALDO DE DEUDOR
  const handleCobrarDeudaBJ = async (grupo, montoFinal) => {
    if(confirm(`¿Confirmar cobro de saldo S/ ${Number(montoFinal).toFixed(2)}?`)) {
        const snapshotCaja = balanceEliteBJ.cG;
        for(let id of grupo.items_ids) { 
            await supabase.from('ventas').update({ estado_pedido: 'Entregado' }).eq('id', id); 
        }
        if(Number(montoFinal) > 0) {
            await supabase.from('finanzas').insert([{ 
                tipo: 'Ingreso Adicional', descripcion: `Saldo liquidado deuda: ${grupo.cliente}`, 
                monto: Number(montoFinal), origen: 'Caja Global' 
            }]);
            await supabase.from('auditoria_bj').insert([{ 
                cliente: grupo.cliente, operacion: 'COBRO SALDO', 
                monto_operacion: Number(montoFinal), caja_antes: snapshotCaja, caja_despues: snapshotCaja + Number(montoFinal) 
            }]);
        }
        cargarTodoDesdeNube();
        alert("💰 Deuda saldada.");
    }
  };

  // 3. ANULAR CRÉDITO COMPLETO (REVERSA TOTAL)
  const handleAnularCreditoBJ = async (grupo) => {
    if (confirm(`⚠️ ¿ANULAR CRÉDITO DE ${grupo.cliente}?\nSe devolverá el stock y se borrará el abono de caja.`)) {
      const { data: abono } = await supabase.from('finanzas').select('id').ilike('descripcion', `%${grupo.cliente}%`).order('created_at', { ascending: false }).limit(1);
      if (abono?.length > 0) await supabase.from('finanzas').delete().eq('id', abono[0].id);
      for (const it of grupo.items) {
        const pO = productos.find(p => p.id === it.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock + it.cantidad }).eq('id', pO.id);
      }
      await supabase.from('ventas').delete().in('id', grupo.items_ids);
      cargarTodoDesdeNube();
      alert("🗑️ Crédito anulado satisfactoriamente.");
    }
  };

  // 4. EDICIÓN DE ÍTEMS EN LOGÍSTICA
  const handleUpdateItemLogistica = async (id, dataNueva, idAnt, cantAnt) => {
      // Si cambia el producto o cantidad, reajustamos stock
      if (dataNueva.producto_id !== idAnt || dataNueva.cantidad !== cantAnt) {
          const pAnt = productos.find(p => p.id === idAnt);
          if (pAnt) await supabase.from('productos').update({ stock: pAnt.stock + Number(cantAnt) }).eq('id', pAnt.id);
          const pNue = productos.find(p => p.id === dataNueva.producto_id);
          if (pNue) await supabase.from('productos').update({ stock: pNue.stock - Number(dataNueva.cantidad) }).eq('id', pNue.id);
      }
      await supabase.from('ventas').update(dataNueva).eq('id', id);
      cargarTodoDesdeNube();
      alert("✅ Ítem actualizado.");
  };

  const handleEliminarItemIndividualLogistica = async (v) => {
      if (confirm("¿Borrar este producto del pedido?")) {
          const pO = productos.find(p => p.id === v.producto_id);
          if (pO) await supabase.from('productos').update({ stock: pO.stock + v.cantidad }).eq('id', pO.id);
          await supabase.from('ventas').delete().eq('id', v.id);
          cargarTodoDesdeNube();
      }
  };

  // [BLOQUE H: RENDER FINAL]
  if (!hasMounted) return null;
  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>BUNKER BJ v1.2 - CARGANDO LÓGICA... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ backgroundColor: '#ffffff', padding: '15px 5%', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>BJ</div>
          <div><h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1><small style={{ color: '#64748B', fontWeight: '900', fontSize: '9px' }}>v1.2 MASTER SYSTEM</small></div>
        </div>
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: `#FCA5D415`, padding: '5px', borderRadius: '15px' }}>
          {['ventas', 'stock', 'logistica', 'contabilidad'].map(t => (
            <button key={t} onClick={() => setVista(t)} style={{ backgroundColor: vista === t ? (t === 'logistica' ? OSCURO_BJ : FUCSIA_PRINCIPAL) : 'transparent', border: 'none', color: vista === t ? '#fff' : (t === 'logistica' ? OSCURO_BJ : FUCSIA_PRINCIPAL), padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: '900', textTransform:'uppercase' }}>
                {t === 'contabilidad' ? 'GESTIÓN' : (t === 'stock' ? 'ALMACÉN' : t)}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>
        {vista === 'ventas' && <VentasSection {...{ balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull: ()=>{}, tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente: (e)=>setCliente(e.target.value), ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ, handleAnularVentaBJ: async (v)=>{ const pO = productos.find(p=>p.id===v.producto_id); if(pO) await supabase.from('productos').update({stock: pO.stock + v.cantidad}).eq('id', pO.id); await supabase.from('ventas').delete().eq('id',v.id); cargarTodoDesdeNube(); }, analiticaProBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        
        {vista === 'stock' && <AlmacenSection {...{ formProd, setFormProd, handleAddProductoBJ: async (e)=>{e.preventDefault(); await supabase.from('productos').insert([formProd]); setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); cargarTodoDesdeNube();}, busquedaStock, setBusquedaStock, productos, idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, handleUpdateProductoBJ: async (id)=>{await supabase.from('productos').update(formEditProducto).eq('id',id); setIdEditProducto(null); cargarTodoDesdeNube();}, handleDeleteProductoBJ: async (id,n)=>{if(confirm(`Borrar ${n}?`)){await supabase.from('productos').delete().eq('id',id); cargarTodoDesdeNube();}}, formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ: async (id,s)=>{await supabase.from('productos').update({stock:Number(s)}).eq('id',id); cargarTodoDesdeNube();}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}

        {vista === 'logistica' && <LogisticaSection {...{ logisticaInteligente, handleCobrarDeudaBJ, handleAnularCreditoBJ, handleUpdateItemLogistica, handleEliminarItemIndividualLogistica, productos, finanzas, FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp }} />}

        {vista === 'contabilidad' && <GestionSection {...{ balanceEliteBJ, valorizacionStockBJ, analiticaProBJ, finanzas, idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ: async (id)=>{await supabase.from('finanzas').update(formEditFinanza).eq('id',id); setIdEditFinanza(null); cargarTodoDesdeNube();}, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ: async (e)=>{e.preventDefault(); await supabase.from('finanzas').insert([formFinanzas]); setFormFinanzas({tipo:'Gasto Local', descripcion:'', monto:'', origen:'Caja Global'}); cargarTodoDesdeNube();}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
      </main>
    </div>
  );
}