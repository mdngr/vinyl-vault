<style>
/* Masqué par défaut en version Desktop */
.mobile-tab-bar {
  display: none;
}

/* Visibilité forcée en version Mobile (<= 768px) */
@media (max-width: 768px) {
  .mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    
    /* On fixe la hauteur utile de la barre à 56px + la zone iOS */
    height: calc(56px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    
    background: rgba(24, 24, 27, 0.98);
    backdrop-filter: blur(12px);
    border-top: 1px solid #27272a;
    display: flex !important;
    justify-content: space-around;
    /* Aligne le contenu en haut de la barre pour dégager la zone du bas */
    align-items: flex-start;
    padding-top: 6px;
    z-index: 2000;
  }

  .tab-item {
    background: transparent;
    border: none;
    color: #71717a;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 0.65rem;
    cursor: pointer;
    flex: 1;
    padding: 0;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .tab-item.active {
    color: #3b82f6;
    font-weight: 700;
  }
}
</style>