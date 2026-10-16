!include nsDialogs.nsh
!include LogicLib.nsh

Var Dialog
Var Label
Var RadioStandalone
Var RadioServer
Var RadioClient
Var SelectedMode

# Custom page declaration
Page custom ModePageCreate ModePageLeave

Function ModePageCreate
  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Please select the installation type for HomoeoStore ERP:"
  Pop $Label

  ${NSD_CreateRadioButton} 10u 30u 80% 15u "Standalone (Recommended - Runs both Client and Local Database on this PC)"
  Pop $RadioStandalone
  ${NSD_CreateRadioButton} 10u 50u 80% 15u "Server Mode (Main System - Hosts database for other computers on network)"
  Pop $RadioServer
  ${NSD_CreateRadioButton} 10u 70u 80% 15u "Client Mode (Terminal System - Connects to a Main System on the network)"
  Pop $RadioClient

  # Set default selection
  ${If} $SelectedMode == "SERVER"
    ${NSD_Check} $RadioServer
  ${ElseIf} $SelectedMode == "CLIENT"
    ${NSD_Check} $RadioClient
  ${Else}
    ${NSD_Check} $RadioStandalone
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function ModePageLeave
  ${NSD_GetState} $RadioStandalone $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $SelectedMode "LOCAL"
  ${EndIf}

  ${NSD_GetState} $RadioServer $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $SelectedMode "SERVER"
  ${EndIf}

  ${NSD_GetState} $RadioClient $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $SelectedMode "CLIENT"
  ${EndIf}
FunctionEnd

!macro customInstall
  FileOpen $0 "$INSTDIR\mode.txt" w
  FileWrite $0 $SelectedMode
  FileClose $0
!macroend
