package ai.shehzadalgo.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class ShehzadAlgoProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", ShehzadAlgoCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", ShehzadAlgoCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", ShehzadAlgoCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", ShehzadAlgoCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", ShehzadAlgoCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", ShehzadAlgoCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", ShehzadAlgoCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", ShehzadAlgoCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", ShehzadAlgoCapability.Canvas.rawValue)
    assertEquals("camera", ShehzadAlgoCapability.Camera.rawValue)
    assertEquals("screen", ShehzadAlgoCapability.Screen.rawValue)
    assertEquals("voiceWake", ShehzadAlgoCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", ShehzadAlgoScreenCommand.Record.rawValue)
  }
}
