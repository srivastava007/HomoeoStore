import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';


const CacheContext = createContext();

export function useCache() {
  return useContext(CacheContext);
}

export function CacheProvider({ children }) {
  const [medicines, setMedicines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [powers, setPowers] = useState([]);
  const [packings, setPackings] = useState([]);
  const [hsnSacList, setHsnSacList] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [mrs, setMrs] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null);
  const [isCacheLoading, setIsCacheLoading] = useState(true);

  // Individual list refreshing functions
  const refreshMedicines = useCallback(async () => {
    try {
      const data = await window.api.getMedicines();
      const processed = (data || []).map(item => {
        const name = item.name || '';
        const potency = item.potency || '';
        const company = item.company || '';
        const unit = item.unit || '';
        return {
          ...item,
          nameLower: name.toLowerCase(),
          companyLower: company.toLowerCase(),
          _searchKey: `${name} ${potency} ${company} ${unit}`.toLowerCase()
        };
      });
      setMedicines(processed);
    } catch (e) {
      console.error('Failed to refresh medicines cache:', e);
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await window.api.getCompanies();
      setCompanies(data || []);
    } catch (e) {
      console.error('Failed to refresh companies cache:', e);
    }
  }, []);

  const refreshSuppliers = useCallback(async () => {
    try {
      const data = await window.api.getSuppliers();
      setSuppliers(data || []);
    } catch (e) {
      console.error('Failed to refresh suppliers cache:', e);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const data = await window.api.getCategories();
      setCategories(data || []);
    } catch (e) {
      console.error('Failed to refresh categories cache:', e);
    }
  }, []);

  const refreshPowers = useCallback(async () => {
    try {
      const data = await window.api.getPowers();
      setPowers(data || []);
    } catch (e) {
      console.error('Failed to refresh powers cache:', e);
    }
  }, []);

  const refreshPackings = useCallback(async () => {
    try {
      const data = await window.api.getPackings();
      setPackings(data || []);
    } catch (e) {
      console.error('Failed to refresh packings cache:', e);
    }
  }, []);

  const refreshHsnSacList = useCallback(async () => {
    try {
      const data = await window.api.getHsnSac();
      setHsnSacList(data || []);
    } catch (e) {
      console.error('Failed to refresh HSN/SAC cache:', e);
    }
  }, []);

  const refreshLedgers = useCallback(async () => {
    try {
      const data = await window.api.getLedgers();
      setLedgers(data || []);
    } catch (e) {
      console.error('Failed to refresh ledgers cache:', e);
    }
  }, []);

  const refreshGodowns = useCallback(async () => {
    try {
      const data = await window.api.getGodowns();
      setGodowns(data || []);
    } catch (e) {
      console.error('Failed to refresh godowns cache:', e);
    }
  }, []);

  const refreshMRs = useCallback(async () => {
    try {
      const data = await window.api.getMRs();
      setMrs(data || []);
    } catch (e) {
      console.error('Failed to refresh MRs cache:', e);
    }
  }, []);

  const refreshStoreProfile = useCallback(async () => {
    try {
      const data = await window.api.getStoreProfile();
      setStoreProfile(data || null);
    } catch (e) {
      console.error('Failed to refresh store profile cache:', e);
    }
  }, []);

  const logEvent = useCallback((msg) => {
    console.log(msg);
    if (window.api && window.api.logRendererEvent) {
      window.api.logRendererEvent('info', msg);
    }
  }, []);

  const runLoggedTask = useCallback(async (name, taskFn) => {
    const start = performance.now();
    logEvent(`[Cache] Starting task: ${name}`);
    try {
      await taskFn();
      const duration = (performance.now() - start).toFixed(2);
      logEvent(`[Cache] Completed task: ${name} in ${duration}ms`);
    } catch (e) {
      logEvent(`[Cache] Failed task: ${name} with error: ${e.message || String(e)}`);
      throw e;
    }
  }, [logEvent]);

  const initializeCache = useCallback(async () => {
    const startAll = performance.now();
    setIsCacheLoading(true);
    logEvent('[Cache] Starting complete cache initialization...');
    try {
      await Promise.all([
        runLoggedTask('Medicines', refreshMedicines),
        runLoggedTask('Companies', refreshCompanies),
        runLoggedTask('Suppliers', refreshSuppliers),
        runLoggedTask('Categories', refreshCategories),
        runLoggedTask('Powers', refreshPowers),
        runLoggedTask('Packings', refreshPackings),
        runLoggedTask('HsnSacList', refreshHsnSacList),
        runLoggedTask('Ledgers', refreshLedgers),
        runLoggedTask('Godowns', refreshGodowns),
        runLoggedTask('MRs', refreshMRs),
        runLoggedTask('StoreProfile', refreshStoreProfile)
      ]);
      const durationAll = (performance.now() - startAll).toFixed(2);
      logEvent(`[Cache] Cache initialization completed successfully in ${durationAll}ms`);
    } catch (e) {
      logEvent(`[Cache] Cache initialization failed: ${e.message || String(e)}`);
    } finally {
      setIsCacheLoading(false);
    }
  }, [
    logEvent,
    runLoggedTask,
    refreshMedicines,
    refreshCompanies,
    refreshSuppliers,
    refreshCategories,
    refreshPowers,
    refreshPackings,
    refreshHsnSacList,
    refreshLedgers,
    refreshGodowns,
    refreshMRs,
    refreshStoreProfile
  ]);


  return (
    <CacheContext.Provider value={{
      medicines,
      companies,
      suppliers,
      categories,
      powers,
      packings,
      hsnSacList,
      ledgers,
      godowns,
      mrs,
      storeProfile,
      isCacheLoading,
      refreshMedicines,
      refreshCompanies,
      refreshSuppliers,
      refreshCategories,
      refreshPowers,
      refreshPackings,
      refreshHsnSacList,
      refreshLedgers,
      refreshGodowns,
      refreshMRs,
      refreshStoreProfile,
      initializeCache
    }}>
      {children}
    </CacheContext.Provider>
  );
}
