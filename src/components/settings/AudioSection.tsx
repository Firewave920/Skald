import { useState, useEffect } from 'react';
import { getAudioDevices, setAudioDevice as setAudioDeviceCmd } from '../../api/abs';
import type { AudioDevice } from '../../api/abs';
import Icon from '../Icon';
import { SectionHead, Row } from './shared';
import Dropdown from './Dropdown';

export interface AudioSectionProps {}

export default function AudioSection() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getAudioDevices()
      .then(list => {
        setDevices(list);
        setSelectedId(prev => prev ?? list[0]?.id ?? null);
      })
      .catch(console.error);
  }, []);

  function selectDevice(id: string) {
    setSelectedId(id);
    setAudioDeviceCmd(id).catch(console.error);
  }

  // The currently selected device — used to label the trigger button.
  const currentDevice = devices.find(d => d.id === selectedId);

  return (
    <div>
      <SectionHead title="Audio" subtitle="Output device and signal-chain preferences." />

      <Row label="Output device" hint="Active right now. Pick a different device any time from the toolbar." align="top">
        {devices.length === 0 ? (
          // Loading state — shown before the Tauri command resolves.
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: 'var(--onyx-text-mute)', padding: '8px 12px', letterSpacing: '0.06em' }}>
            Loading devices…
          </div>
        ) : (
          // Popout dropdown — breaks out of the Glass panel's overflow clipping
          // using position: fixed so the list is never cropped by the settings pane.
          <Dropdown
            // Trigger shows the selected device name and a headphones icon.
            trigger={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="headphones" size={13} color="var(--onyx-text-dim)" />
                <span>{currentDevice?.name ?? 'Select device'}</span>
              </span>
            }
            // Map AudioDevice to the generic DropdownItem shape.
            items={devices.map(d => ({ id: d.id, name: d.name, sub: d.sub, icon: 'headphones' }))}
            selected={selectedId}
            onChange={selectDevice}
            align="right"
          />
        )}
      </Row>
    </div>
  );
}
