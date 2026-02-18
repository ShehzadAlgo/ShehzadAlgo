package ai.shehzadalgo.android.ui

import androidx.compose.runtime.Composable
import ai.shehzadalgo.android.MainViewModel
import ai.shehzadalgo.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
