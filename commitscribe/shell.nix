{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    nodePackages.npm
    nodePackages.mocha
    typescript
    zsh
  ];

  shellHook = ''
    # Create local npm bin directory if it doesn't exist
    mkdir -p ~/.npm-packages/bin

    # Set npm global install path to user directory
    export NPM_CONFIG_PREFIX=~/.npm-packages

    # Add npm global bin to PATH
    export PATH=$PATH:~/.npm-packages/bin

    # Install tfx-cli if not already installed
    if ! command -v tfx &> /dev/null; then
      echo "Installing tfx-cli..."
      npm install -g tfx-cli
    fi

    zsh
  '';
}
