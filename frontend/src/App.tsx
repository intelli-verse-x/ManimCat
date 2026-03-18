import { useEffect, useState } from 'react';
import type { OutputMode, Quality, ReferenceImage } from './types/api';
import { useGeneration } from './hooks/useGeneration';
import { useGame2048 } from './hooks/useGame2048';
import { useTabTitle } from './hooks/useTabTitle';
import { AiModifyModal } from './components/AiModifyModal';
import { SettingsModal } from './components/SettingsModal';
import { DonationModal } from './components/DonationModal';
import { ProviderConfigModal } from './components/ProviderConfigModal';
import { Workspace } from './components/Workspace';
import { StudioPage } from './pages/StudioPage';
import { Game2048Page } from './pages/Game2048Page';
import { useI18n } from './i18n';

function App() {
  const { status, result, error, jobId, stage, generate, renderWithCode, modifyWithAI, reset, cancel } = useGeneration();
  const game = useGame2048();
  useTabTitle(status, stage);
  const { t } = useI18n();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [donationOpen, setDonationOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [aiModifyOpen, setAiModifyOpen] = useState(false);
  const [aiModifyInput, setAiModifyInput] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [concept, setConcept] = useState('');
  const [page, setPage] = useState<'studio' | 'game'>('studio');
  const [lastRequest, setLastRequest] = useState<{
    concept: string;
    quality: Quality;
    outputMode: OutputMode;
    referenceImages?: ReferenceImage[];
  } | null>(null);

  useEffect(() => {
    if (result?.code) {
      setCurrentCode(result.code);
    }
  }, [result?.code]);

  const resetAll = () => {
    reset();
    setCurrentCode('');
    setConcept('');
    setLastRequest(null);
    setAiModifyInput('');
    setAiModifyOpen(false);
    setPage('studio');
  };

  const handleSubmit = (data: {
    concept: string;
    quality: Quality;
    outputMode: OutputMode;
    referenceImages?: ReferenceImage[];
  }) => {
    setConcept(data.concept);
    setLastRequest(data);
    generate(data);
  };

  const handleBackToHome = () => {
    reset();
  };

  const handleRerender = () => {
    if (!lastRequest || !currentCode.trim()) {
      return;
    }

    renderWithCode({ ...lastRequest, code: currentCode });
  };

  const handleAiModifySubmit = () => {
    if (!lastRequest || !currentCode.trim()) {
      return;
    }

    const instructions = aiModifyInput.trim();
    if (!instructions) {
      return;
    }

    setAiModifyOpen(false);
    setAiModifyInput('');
    modifyWithAI({
      concept: lastRequest.concept,
      outputMode: lastRequest.outputMode,
      quality: lastRequest.quality,
      instructions,
      code: currentCode,
    });
  };

  const handleOpenGame = () => {
    if (status !== 'processing') {
      return;
    }
    setPage('game');
  };

  const isBusy = status === 'processing';

  return (
    <div className="min-h-screen bg-bg-primary transition-colors duration-300 overflow-x-hidden">
      {page === 'studio' ? (
        <StudioPage
          status={status}
          result={result}
          error={error}
          jobId={jobId}
          stage={stage}
          concept={concept}
          currentCode={currentCode}
          isBusy={isBusy}
          lastRequest={lastRequest}
          onConceptChange={setConcept}
          onSubmit={handleSubmit}
          onCodeChange={setCurrentCode}
          onRerender={handleRerender}
          onAiModifyOpen={() => setAiModifyOpen(true)}
          onResetAll={resetAll}
          onBackToHome={handleBackToHome}
          onCancel={cancel}
          onOpenDonation={() => setDonationOpen(true)}
          onOpenProviders={() => setProvidersOpen(true)}
          onOpenWorkspace={() => setWorkspaceOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenGame={handleOpenGame}
        />
      ) : (
        <Game2048Page
          board={game.board}
          score={game.score}
          bestScore={game.bestScore}
          isGameOver={game.isGameOver}
          hasWon={game.hasWon}
          maxTile={game.maxTile}
          generationStatus={status}
          generationStage={stage}
          onMove={game.move}
          onRestart={game.restart}
          onBackToStudio={() => setPage('studio')}
        />
      )}

      <style>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} onSave={(config) => console.log(t('app.settingsSaved'), config)} />
      <DonationModal isOpen={donationOpen} onClose={() => setDonationOpen(false)} />
      <ProviderConfigModal isOpen={providersOpen} onClose={() => setProvidersOpen(false)} onSave={(config) => console.log(t('app.settingsSaved'), config)} />
      <Workspace isOpen={workspaceOpen} onClose={() => setWorkspaceOpen(false)} />
      <AiModifyModal
        isOpen={aiModifyOpen}
        value={aiModifyInput}
        loading={isBusy}
        onChange={setAiModifyInput}
        onClose={() => setAiModifyOpen(false)}
        onSubmit={handleAiModifySubmit}
      />
    </div>
  );
}

export default App;
