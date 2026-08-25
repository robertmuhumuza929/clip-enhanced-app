import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { execute } from 'ffmpeg-expo';
import * as FileSystem from 'expo-file-system/legacy';

const COLORS = {
  bg: '#07080D',
  panel: '#11131B',
  panel2: '#181B25',
  text: '#F5F7FF',
  muted: '#9298AA',
  accent: '#7C6CFF',
  accent2: '#A99EFF',
  border: '#252938',
  danger: '#FF6577',
};

type Tool = 'Trim' | 'Filter' | 'Text' | 'Audio';
type Filter = 'Original' | 'B&W' | 'Warm' | 'Cool' | 'Vivid' | 'Fade';

export default function App() {
  const videoRef = useRef<Video>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [position, setPosition] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(1);
  const [tool, setTool] = useState<Tool>('Trim');
  const [filter, setFilter] = useState<Filter>('Original');
  const [volume, setVolume] = useState(1);
  const [text, setText] = useState('');
  const [textSize, setTextSize] = useState(32);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);\n  const [showDetails, setShowDetails] = useState(false);
  const [captionEnabled, setCaptionEnabled] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [aspect, setAspect] = useState('Original');
  const [quality, setQuality] = useState('1080p');

  const selectedStart = Math.max(0, Math.min(start, end - 0.1));
  const selectedEnd = Math.max(selectedStart + 0.1, end);

  const filterGraph = useMemo(() => {
    switch (filter) {
      case 'B&W': return 'hue=s=0';
      case 'Warm': return 'eq=saturation=1.12:contrast=1.03:brightness=0.03';
      case 'Cool': return 'colorbalance=bs=.12:gs=.02:rs=-.03';
      case 'Vivid': return 'eq=saturation=1.35:contrast=1.08';
      case 'Fade': return 'eq=contrast=0.88:brightness=0.06:saturation=0.82';
      default: return '';
    }
  }, [filter]);

  useEffect(() => {
    if (!videoUri) return;
    setStart(0);
    setEnd(duration || 1);
  }, [videoUri, duration]);

  const cycleCaption = () => setCaptionEnabled(v => !v);
  const cycleSpeed = () => setSpeed(v => (v === 1 ? 1.5 : v === 1.5 ? 0.5 : 1));
  const cycleAspect = () => setAspect(v => (v === 'Original' ? '9:16' : v === '9:16' ? '1:1' : v === '1:1' ? '16:9' : 'Original'));
  const cycleQuality = () => setQuality(v => (v === '1080p' ? '720p' : v === '720p' ? '480p' : '1080p'));

  const resetEdit = () => {
    if (!videoUri) return;
    Alert.alert('Start over?', 'This clears the current edit from Clip. Your original video stays on your phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start over',
        style: 'destructive',
        onPress: () => {
          setVideoUri(null);
          setPosition(0);
          setDuration(1);
          setStart(0);
          setEnd(1);
          setFilter('Original');
          setVolume(1);
          setText('');
          setTextSize(32);
          setIsPlaying(false);
          setCaptionEnabled(false);
          setSpeed(1);
          setAspect('Original');
          setQuality('1080p');
        },
      },
    ]);
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow Clip to access your videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setPosition(0);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) await videoRef.current.pauseAsync();
    else await videoRef.current.playAsync();
    setIsPlaying(!isPlaying);
  };

  const seek = async (value: number) => {
    setPosition(value);
    await videoRef.current?.setPositionAsync(value * 1000);
  };

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) setDuration(status.durationMillis / 1000);
    setPosition((status.positionMillis || 0) / 1000);
    if (status.didJustFinish) setIsPlaying(false);
  };

  const exportVideo = async () => {
    if (!videoUri || exporting) return;
    if (selectedEnd - selectedStart < 0.1) {
      Alert.alert('Trim is too short', 'Choose a slightly longer section before exporting.');
      return;
    }
    setExporting(true);
    setExportProgress(0);
    try {
      const input = videoUri.replace(/^file:\/\//, '');
      const output = `${FileSystem.cacheDirectory}clip-${Date.now()}.mp4`.replace(/^file:\/\//, '');
      const args = ['-ss', String(selectedStart), '-i', input, '-t', String(selectedEnd - selectedStart)];
      if (filterGraph) args.push('-vf', filterGraph);
      if (volume !== 1) args.push('-af', `volume=${volume}`);
      args.push('-c:v', 'mpeg4', '-c:a', 'aac', '-movflags', '+faststart', '-y', output);

      const session = execute(args, {
        onProgress: (p: any) => {
          const total = Math.max(0.1, selectedEnd - selectedStart);
          setExportProgress(Math.min(0.99, (p.time || 0) / (total * 1000)));
        },
      });
      const result = await session;
      if (result.returnCode !== 0) throw new Error(result.output || `FFmpeg returned ${result.returnCode}`);

      const uri = `file://${output}`;
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (!mediaPermission.granted) throw new Error('Media-library permission was not granted.');
      await MediaLibrary.createAssetAsync(uri);
      setExportProgress(1);
      Alert.alert('Export complete', 'Your edited video was saved to the gallery.');
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'The video could not be exported.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>CLIP</Text>
          <Text style={styles.tagline}>Make ordinary clips feel yours.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={() => setShowDetails(v => !v)}>
            <Text style={styles.headerButtonText}>ⓘ</Text>
          </Pressable>
          <Pressable style={styles.importSmall} onPress={pickVideo}>
            <Text style={styles.importSmallText}>＋ Import</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showDetails ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Clip 2.1</Text>
            <Text style={styles.infoText}>Edit privately on your phone. Exported videos are saved to your gallery.</Text>
            <Text style={styles.infoText}>Tip: shorter clips export faster, especially on entry-level phones.</Text>
          </View>
        ) : null}
        <View style={styles.previewCard}>
          {videoUri ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
              volume={volume}
              onPlaybackStatusUpdate={onStatus}
            />
          ) : (
            <Pressable style={styles.emptyPreview} onPress={pickVideo}>
              <Text style={styles.plus}>＋</Text>
              <Text style={styles.emptyTitle}>Start a new edit</Text>
              <Text style={styles.emptyText}>Import a video from your phone</Text>
            </Pressable>
          )}
          {videoUri && text ? (
            <View style={styles.overlay} pointerEvents="none">
              <Text style={{ color: '#fff', fontSize: textSize, fontWeight: '800', textAlign: 'center' }}>{text}</Text>
            </View>
          ) : null}
        </View>

        {videoUri ? (
          <>
            <View style={styles.transport}>
              <Text style={styles.time}>{formatTime(position)}</Text>
              <Pressable style={styles.play} onPress={togglePlay}>
                <Text style={styles.playText}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
              </Pressable>
              <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={Math.max(1, duration)}
              value={position}
              onSlidingComplete={seek}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.text}
            />

            <View style={styles.timelineHeader}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <Text style={styles.duration}>{formatTime(selectedEnd - selectedStart)} selected</Text>
            </View>
            <View style={styles.trimBox}>
              <Text style={styles.trimLabel}>START  {formatTime(selectedStart)}</Text>
              <Slider minimumValue={0} maximumValue={Math.max(0.1, duration - 0.1)} value={selectedStart} onValueChange={v => setStart(Math.min(v, selectedEnd - 0.1))} minimumTrackTintColor={COLORS.accent} maximumTrackTintColor={COLORS.border} />
              <Text style={styles.trimLabel}>END  {formatTime(selectedEnd)}</Text>
              <Slider minimumValue={0.1} maximumValue={Math.max(0.2, duration)} value={selectedEnd} onValueChange={v => setEnd(Math.max(v, selectedStart + 0.1))} minimumTrackTintColor={COLORS.accent2} maximumTrackTintColor={COLORS.border} />
            </View>

            <View style={styles.tools}>
              {(['Trim', 'Filter', 'Text', 'Audio'] as Tool[]).map(item => (
                <Pressable key={item} onPress={() => setTool(item)} style={[styles.tool, tool === item && styles.toolActive]}>
                  <Text style={[styles.toolText, tool === item && styles.toolTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.panel}>
              {tool === 'Trim' && <Text style={styles.helper}>Drag the two controls to choose exactly what will be exported.</Text>}
              {tool === 'Filter' && (
                <View style={styles.chips}>
                  {(['Original', 'B&W', 'Warm', 'Cool', 'Vivid', 'Fade'] as Filter[]).map(item => (
                    <Pressable key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.chipActive]}>
                      <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {tool === 'Text' && (
                <>
                  <TextInput value={text} onChangeText={setText} placeholder="Type your caption" placeholderTextColor={COLORS.muted} style={styles.input} />
                  <Text style={styles.sliderLabel}>Text size</Text>
                  <Slider minimumValue={18} maximumValue={64} value={textSize} onValueChange={setTextSize} minimumTrackTintColor={COLORS.accent} maximumTrackTintColor={COLORS.border} thumbTintColor={COLORS.text} />
                </>
              )}
              {tool === 'Audio' && (
                <>
                  <Text style={styles.sliderLabel}>Original audio: {Math.round(volume * 100)}%</Text>
                  <Slider minimumValue={0} maximumValue={1} value={volume} onValueChange={setVolume} minimumTrackTintColor={COLORS.accent} maximumTrackTintColor={COLORS.border} thumbTintColor={COLORS.text} />
                </>
              )}
            </View>

            <View style={styles.actionRow}>
              <Pressable disabled={exporting} onPress={resetEdit} style={styles.resetButton}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable disabled={exporting} onPress={exportVideo} style={[styles.exportButton, exporting && styles.exportDisabled]}>
                <Text style={styles.exportText}>{exporting ? `Exporting ${Math.round(exportProgress * 100)}%` : 'Export video  →'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable onPress={pickVideo} style={styles.importButton}>
            <Text style={styles.importButtonText}>Import your first video</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>Clip • Private on-device editing • No account required</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  headerButtonText: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  infoCard: { backgroundColor: COLORS.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  infoTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  infoText: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  logo: { color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  tagline: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  importSmall: { backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12 },
  importSmallText: { color: COLORS.text, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  previewCard: { height: 330, backgroundColor: '#020307', borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
  video: { width: '100%', height: '100%' },
  emptyPreview: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  plus: { color: COLORS.accent2, fontSize: 48, fontWeight: '200' },
  emptyTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  emptyText: { color: COLORS.muted, marginTop: 6 },
  overlay: { position: 'absolute', left: 20, right: 20, bottom: 35, alignItems: 'center' },
  transport: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  time: { color: COLORS.muted, fontVariant: ['tabular-nums'], fontSize: 12 },
  play: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  playText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  duration: { color: COLORS.muted, fontSize: 12 },
  trimBox: { backgroundColor: COLORS.panel, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: COLORS.border },
  trimLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tools: { flexDirection: 'row', gap: 7, marginTop: 16 },
  tool: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.panel },
  toolActive: { backgroundColor: COLORS.accent },
  toolText: { color: COLORS.muted, fontWeight: '700', fontSize: 12 },
  toolTextActive: { color: '#fff' },
  panel: { marginTop: 10, backgroundColor: COLORS.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  helper: { color: COLORS.muted, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.muted, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: COLORS.panel2, color: COLORS.text, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  sliderLabel: { color: COLORS.muted, fontSize: 12, marginTop: 12 },
  quickCard: { backgroundColor: COLORS.panel, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  sectionHint: { color: COLORS.muted, fontSize: 11 },
  quickGrid: { flexDirection: 'row', gap: 8 },
  quickTool: { flex: 1, minHeight: 68, borderRadius: 13, backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { color: COLORS.text, fontWeight: '900', fontSize: 14, marginBottom: 5 },
  quickLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  workflowCard: { backgroundColor: COLORS.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  workflowTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14, marginBottom: 6 },
  workflowText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  workflowSub: { color: COLORS.muted, fontSize: 11, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 16 },
  resetButton: { width: 82, borderRadius: 15, paddingVertical: 16, alignItems: 'center', backgroundColor: COLORS.panel2, borderWidth: 1, borderColor: COLORS.border },
  resetText: { color: COLORS.text, fontWeight: '800' },
  exportButton: { flex: 1, backgroundColor: COLORS.text, borderRadius: 15, paddingVertical: 16, alignItems: 'center' },
  exportDisabled: { opacity: 0.55 },
  exportText: { color: COLORS.bg, fontWeight: '900', fontSize: 15 },
  importButton: { marginTop: 16, backgroundColor: COLORS.accent, borderRadius: 15, paddingVertical: 16, alignItems: 'center' },
  importButtonText: { color: '#fff', fontWeight: '900' },
  footer: { color: '#555B6B', textAlign: 'center', fontSize: 11, marginTop: 28 },
});
