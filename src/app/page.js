"use client";
/**
 * ============================================================================
 * SISTEMA: BUNKER BJ - MASTER CONTROL (v1.7.0 AUDIT TOTAL)
 * PROPIETARIO: Jean - B J Importaciones Chiclayo
 * * FUNCIONES VERIFICADAS:
 * 1. Bóveda (bR): Utilidad acumulada pura (Venta - Costo).
 * 2. Caja Global (cG): Saldo físico real (Cash + Inversiones - Gastos).
 * 3. Logística: Separación de 'En Almacén' (Pagado) y 'Créditos'.
 * 4. Auditoría: Registro automático de cada sol que entra o sale.
 * 5. Stock: Suma y resta automática en ventas, anulaciones y logística.
 * ============================================================================
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { getFechaPeru, handleInputMonto, getHoraPeru, formatForInputDT } from '../lib/helpers';

// IMPORTACIÓN DE COMPONENTES
import VentasSection from '../components/Ventas';
import AlmacenSection from '../components/Almacen';
import LogisticaSection from '../components/Logistica';
import GestionSection from '../components/Gestion';

export default function SistemaBJCMasterFinal() {
  
  // [ESTADOS DE PERSISTENCIA]
  const [hasMounted, setHasMounted] = useState(false);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState([]); 
  const [vista, setVista] = useState('ventas'); 
  const [cargando, setCargando] = useState(true);

  // [ESTADOS OPERATIVOS]
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

  // [ESTADOS DE EDICIÓN]
  const [formProd, setFormProd] = useState({ nombre: '', precio_compra: '', precio_venta: '', precio_menor: '', stock: '', colores: '' });
  const [formFinanzas, setFormFinanzas] = useState({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
  const [idEditFinanza, setIdEditFinanza] = useState(null);
  const [formEditFinanza, setFormEditFinanza] = useState({});
  const [idEditProducto, setIdEditProducto] = useState(null);
  const [formEditProducto, setFormEditProducto] = useState({});

  // [DISEÑO RESPONSIVO BJ]
  const FUCSIA_PRINCIPAL = '#F01097';
  const VERDE_BJ = '#16A34A';
  const ROJO_BJ = '#E11D48';
  const AMARILLO_BJ = '#CA8A04';
  const OSCURO_BJ = '#1E1B1C';

  const styleInp = { padding: '16px', borderRadius: '16px', border: `2px solid #FCC2E2`, width: '100%', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff' };
  const styleCrd = { backgroundColor: '#ffffff', borderRadius: '30px', padding: '25px', boxShadow: `0 15px 35px rgba(240, 16, 151, 0.05)`, border: '1px solid #FFF1F2', boxSizing: 'border-box' };

  useEffect(() => { setHasMounted(true); cargarTodoDesdeNube(); }, []);

  const cargarTodoDesdeNube = async () => {
    try {
        const { data: p } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
        const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: true });
        const { data: f } = await supabase.from('finanzas').select('*').order('created_at', { ascending: false });
        const { data: a } = await supabase.from('auditoria_bj').select('*').order('created_at', { ascending: true });
        if (p) setProductos(p); if (v) setVentas(v); if (f) setFinanzas(f); if (a) setAuditoriaLogs(a);
    } catch (e) { console.error("Sync Error:", e); } finally { setCargando(false); }
  };

  // [BLOQUE FINANCIERO BLINDADO]
  const balanceEliteBJ = useMemo(() => {
    const s = { cH: 0, gH: 0, cG: 0, bR: 0, pe_p: 0, pe_g: 0, pe_m: 0 };
    if (!ventas.length && !finanzas.length) return s;
    const hoyS = getFechaPeru();
    const mesI = hoyS.substring(0,7);

    // 1. CAJA GLOBAL FÍSICA (Flujo de Efectivo)
    const ingresosVentasCash = ventas
        .filter(v => v.estado_pedido !== 'Anulado' && v.estado_pedido !== 'Pendiente de Pago')
        .reduce((acc, v) => acc + (Number(v.precio_venta_unitario) * Number(v.cantidad)), 0);

    const abonosCreditos = auditoriaLogs
        .filter(l => l.operacion === 'ABONO CRÉDITO' || l.operacion === 'COBRO SALDO')
        .reduce((acc, l) => acc + Number(l.monto_operacion), 0);

    const capitalExtra = finanzas
        .filter(f => ['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);

    const todosLosEgresos = finanzas
        .filter(f => !['Ingreso Adicional', 'Inversión Inicial'].includes(f.tipo))
        .reduce((acc, f) => acc + Number(f.monto), 0);

    const cajaRealFisica = (ingresosVentasCash + abonosCreditos + capitalExtra) - todosLosEgresos;

    // 2. BÓVEDA PARA RETIRO (Utilidad de Venta Acumulada)
    const utilidadAcumulada = ventas
        .filter(v => v.estado_pedido !== 'Anulado')
        .reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);

    // Métricas diarias y mensuales
    const utMes = ventas.filter(v => getFechaPeru(v.created_at).substring(0,7) === mesI && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0);
    const exMes = finanzas.filter(f => getFechaPeru(f.created_at).substring(0,7) === mesI && ['Gasto Local','Retiro Personal'].includes(f.tipo)).reduce((acc, f) => acc + Number(f.monto), 0);

    return {
        cH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Pendiente de Pago' && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + (v.precio_venta_unitario*v.cantidad), 0),
        gH: ventas.filter(v => getFechaPeru(v.created_at) === hoyS && v.estado_pedido !== 'Anulado').reduce((acc, v) => acc + Number(v.ganancia_total || 0), 0),
        cG: cajaRealFisica,
        bR: utilidadAcumulada,
        pe_p: exMes > 0 ? (utMes / exMes) * 100 : (utMes > 0 ? 100 : 0), pe_g: utMes, pe_m: exMes
    };
  }, [ventas, finanzas, auditoriaLogs]);

  // [FUNCIONES MAESTRAS]
  const handleEjecutarVentaBJ = async (estado, abonoInicial = 0) => {
    if (!cliente || !localidad || carrito.length === 0) return alert("Faltan datos o el carrito está vacío.");
    const snap = balanceEliteBJ.cG;
    const totalV = carrito.reduce((acc, i) => acc + (Number(i.precio_venta)*i.cantidad), 0);
    const montoHoy = estado === 'Pendiente de Pago' ? Number(abonoInicial) : totalV - Number(descuento);
    const ts = new Date().toISOString();

    const lista = carrito.map(i => ({ 
        cliente_nombre: cliente, localidad, telefono, producto_id: i.producto_id, 
        cantidad: i.cantidad, color: i.color, precio_venta_unitario: i.precio_venta, 
        precio_costo_unitario: i.precio_compra, ganancia_total: (Number(i.precio_venta)-Number(i.precio_compra))*i.cantidad, 
        estado_pedido: estado, created_at: ts 
    }));

    const { error } = await supabase.from('ventas').insert(lista);
    if (!error) {
        if (montoHoy > 0) {
            await supabase.from('auditoria_bj').insert([{ 
                cliente, operacion: estado === 'Pendiente de Pago' ? 'ABONO CRÉDITO' : (estado === 'En Almacén' ? 'PAGO ALMACÉN' : 'VENTA CASH'), 
                monto_operacion: montoHoy, caja_antes: snap, caja_despues: snap + montoHoy 
            }]);
        }
        for (const it of carrito) {
            const pO = productos.find(p => p.id === it.producto_id);
            if (pO) await supabase.from('productos').update({ stock: pO.stock - it.cantidad }).eq('id', it.producto_id);
        }
        setCarrito([]); setCliente(''); setDescuento(0); setLocalidad(''); setTelefono('');
        cargarTodoDesdeNube();
    }
  };

  const handleAnularVentaBJ = async (v) => {
    if (confirm("¿Anular venta? Esto devolverá el stock y el dinero de la caja física.")) {
        const snap = balanceEliteBJ.cG;
        const pO = productos.find(p => p.id === v.producto_id);
        if (pO) await supabase.from('productos').update({ stock: pO.stock + v.cantidad }).eq('id', pO.id);
        
        if (v.estado_pedido !== 'Pendiente de Pago') {
            const montoADevolver = v.precio_venta_unitario * v.cantidad;
            await supabase.from('auditoria_bj').insert([{ 
                cliente: v.cliente_nombre, operacion: 'ANULACIÓN VENTA', 
                monto_operacion: -montoADevolver, caja_antes: snap, caja_despues: snap - montoADevolver 
            }]);
        }
        await supabase.from('ventas').delete().eq('id', v.id);
        cargarTodoDesdeNube();
    }
  };

  const handleRegistrarFinanzaBJ = async (e) => {
    e.preventDefault();
    const pre = balanceEliteBJ.cG;
    const mF = Number(handleInputMonto(formFinanzas.monto));
    const esGosto = !['Ingreso Adicional', 'Inversión Inicial'].includes(formFinanzas.tipo);
    const delta = esGosto ? -mF : mF;

    const { error } = await supabase.from('finanzas').insert([{ ...formFinanzas, monto: mF }]);
    if (!error) {
        await supabase.from('auditoria_bj').insert([{ 
            cliente: 'ADMIN', operacion: formFinanzas.tipo.toUpperCase(), 
            monto_operacion: delta, caja_antes: pre, caja_despues: pre + delta 
        }]);
        setFormFinanzas({ tipo: 'Gasto Local', descripcion: '', monto: '', origen: 'Caja Global' });
        cargarTodoDesdeNube();
    }
  };

  // Resto de Memos necesarios para los componentes
  const valorizacionMemo = useMemo(() => valorizacionStockBJ, [productos]);
  const analiticaMemo = useMemo(() => analiticaProBJ, [ventas]);
  const logisticaMemo = useMemo(() => logisticaInteligente, [ventas]);
  const historialMemo = useMemo(() => historialVentasDiaBJ, [ventas, fechaConsulta, busquedaHistorial]);

  if (!hasMounted) return null;
  if (cargando) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#FFF5F7', color:FUCSIA_PRINCIPAL, fontWeight:'900' }}>BUNKER BJ v1.7.0 MASTER... 🚀</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF5F7', color: OSCURO_BJ, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ backgroundColor: '#ffffff', padding: '10px 5%', position: 'sticky', top: 0, zIndex: 100, boxShadow: `0 4px 15px rgba(0,0,0,0.06)` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: FUCSIA_PRINCIPAL, color: '#fff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>BJ</div>
              <h1 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: FUCSIA_PRINCIPAL }}>BJ IMPORTACIONES</h1>
            </div>
            <small style={{ fontSize: '10px', fontWeight: '900', opacity: 0.4 }}>v1.7.0</small>
          </div>
          <nav style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px', WebkitOverflowScrolling: 'touch' }}>
            {['ventas', 'stock', 'logistica', 'contabilidad'].map(t => (
              <button key={t} onClick={() => setVista(t)} style={{ flex: '0 0 auto', backgroundColor: vista === t ? FUCSIA_PRINCIPAL : '#FCA5D415', border: 'none', color: vista === t ? '#fff' : FUCSIA_PRINCIPAL, padding: '12px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '11px' }}>{t.toUpperCase() === 'CONTABILIDAD' ? 'GESTIÓN' : t.toUpperCase()}</button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '15px' }}>
        {vista === 'ventas' && <VentasSection {...{ balanceEliteBJ, fechaConsulta, setFechaConsulta, handleExportarExcelCajaFull, tipoVenta, setTipoVenta, cliente, handleAutocompleteCliente: handleAutocompleteClienteBJ, ventas, localidad, setLocalidad, telefono, setTelefono, carrito, setCarrito, descuento, setDescuento, handleEjecutarVentaBJ, busqueda, setBusqueda, productos, coloresElegidos, setColoresElegidos, cantidades, setCantidades, busquedaHistorial, setBusquedaHistorial, historialVentasDiaBJ: historialMemo, handleAnularVentaBJ, analiticaProBJ: analiticaMemo, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        {vista === 'stock' && <AlmacenSection {...{ formProd, setFormProd, handleAddProductoBJ: async (e)=>{e.preventDefault(); await supabase.from('productos').insert([formProd]); setFormProd({nombre:'', precio_compra:'', precio_venta:'', precio_menor:'', stock:'', colores:''}); cargarTodoDesdeNube();}, busquedaStock, setBusquedaStock, productos, idEditProducto, setIdEditProducto, formEditProducto, setFormEditProducto, handleUpdateProductoBJ: async (id)=>{await supabase.from('productos').update(formEditProducto).eq('id',id); setIdEditProducto(null); cargarTodoDesdeNube();}, handleDeleteProductoBJ: async (id,n)=>{if(confirm(`Borrar ${n}?`)){await supabase.from('productos').delete().eq('id',id); cargarTodoDesdeNube();}}, formEditStockBJ, setFormEditStockBJ, handleSincronizarStockBJ: async (id,s)=>{await supabase.from('productos').update({stock:Number(s)}).eq('id',id); cargarTodoDesdeNube();}, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
        {vista === 'logistica' && <LogisticaSection {...{ logisticaInteligente: logisticaMemo, handleCobrarDeudaBJ: async (g,m)=>{const pre=balanceEliteBJ.cG; for(let id of g.items_ids){await supabase.from('ventas').update({estado_pedido:'Entregado'}).eq('id',id);} if(Number(m)>0){await supabase.from('auditoria_bj').insert([{cliente:g.cliente,operacion:'COBRO SALDO',monto_operacion:Number(m),caja_antes:pre,caja_despues:pre+Number(m)}]);} cargarTodoDesdeNube();}, handleAnularCreditoBJ: async (g)=>{for(const it of g.items){const pO=productos.find(p=>p.id===it.producto_id); if(pO) await supabase.from('productos').update({stock:pO.stock+it.cantidad}).eq('id',pO.id);} await supabase.from('ventas').delete().in('id',g.items_ids); cargarTodoDesdeNube();}, productos, finanzas, FUCSIA_PRINCIPAL, VERDE_BJ, AMARILLO_BJ, ROJO_BJ, OSCURO_BJ, styleCrd, styleInp }} />}
        {vista === 'contabilidad' && <GestionSection {...{ balanceEliteBJ, valorizacionStockBJ: valorizacionMemo, analiticaProBJ: analiticaMemo, finanzas, idEditFinanza, setIdEditFinanza, formEditFinanza, setFormEditFinanza, handleUpdateFinanzaBJ: async (id)=>{await supabase.from('finanzas').update(formEditFinanza).eq('id',id); setIdEditFinanza(null); cargarTodoDesdeNube();}, formFinanzas, setFormFinanzas, handleRegistrarFinanzaBJ, FUCSIA_PRINCIPAL, VERDE_BJ, ROJO_BJ, AMARILLO_BJ, OSCURO_BJ, styleInp, styleCrd }} />}
      </main>
    </div>
  );
}